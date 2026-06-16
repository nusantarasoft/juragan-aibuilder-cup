"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
    Button,
    Card,
    Dropdown,
    Empty,
    Input,
    List,
    Space,
    Spin,
    Tabs,
    Tag,
    Typography,
    Alert,
} from "antd";
import {
    PlusOutlined,
    SaveOutlined,
    RocketOutlined,
    DeleteOutlined,
    PlayCircleOutlined,
    SendOutlined,
    CheckCircleOutlined,
    DownOutlined,
} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import {
    studioService,
    type StudioGuideFlow,
    type GuidedTurnResponse,
    type GuideFlowTemplateKind,
    type GuideFlowTemplateInfo,
} from "@/lib/studioService";
import { useAppMessage } from "@/hooks/useAppMessage";
import GuideFlowFormEditor, {
    type GuideFlowDefinition,
    parseGuideFlowDefinition,
} from "./GuideFlowFormEditor";
import GuideFlowPreview from "./GuideFlowPreview";

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
    const message = useAppMessage();
    const [flows, setFlows] = useState<StudioGuideFlow[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editorJson, setEditorJson] = useState("");
    const [editorTab, setEditorTab] = useState<"form" | "json">("form");
    const [formDef, setFormDef] = useState<GuideFlowDefinition | null>(null);
    const [flowName, setFlowName] = useState("");
    const [saving, setSaving] = useState(false);
    const [simConvId, setSimConvId] = useState<string | undefined>();
    const [simHistory, setSimHistory] = useState<SimMessage[]>([]);
    const [simInput, setSimInput] = useState("");
    const [simBusy, setSimBusy] = useState(false);
    const [waitingInput, setWaitingInput] = useState(false);
    const [templates, setTemplates] = useState<GuideFlowTemplateInfo[]>([]);
    const [validating, setValidating] = useState(false);
    const [validationMsg, setValidationMsg] = useState<string | null>(null);

    const selected = flows.find((f) => f.id === selectedId) ?? null;

    const flowKindFromDef = (def: Record<string, unknown> | undefined): string | null => {
        const meta = def?.meta;
        if (meta && typeof meta === "object" && "flowKind" in meta && typeof (meta as { flowKind: unknown }).flowKind === "string") {
            return (meta as { flowKind: string }).flowKind;
        }
        return null;
    };

    const loadFlows = useCallback(async () => {
        if (!notebookId) return;
        setLoading(true);
        try {
            const list = await studioService.getGuideFlows(notebookId);
            setFlows(list);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Failed to load guide flows");
        } finally {
            setLoading(false);
        }
    }, [notebookId, message]);

    useEffect(() => {
        loadFlows();
    }, [loadFlows]);

    useEffect(() => {
        studioService.getGuideFlowTemplates().then(setTemplates).catch(() => setTemplates([]));
    }, []);

    useEffect(() => {
        if (selectedId && !flows.some((f) => f.id === selectedId)) {
            setSelectedId(null);
        }
    }, [flows, selectedId]);

    useEffect(() => {
        if (selected) {
            setFlowName(selected.name);
            const raw = selected.definition;
            const parsed = parseGuideFlowDefinition(raw);
            const json = JSON.stringify(raw, null, 2);
            setEditorJson(json);
            if (parsed.ok) {
                setFormDef(JSON.parse(JSON.stringify(parsed.data)) as GuideFlowDefinition);
            } else {
                setFormDef(null);
            }
            setEditorTab("form");
        } else {
            setFlowName("");
            setEditorJson("");
            setFormDef(null);
            setEditorTab("form");
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

    const handleCreate = async (template: GuideFlowTemplateKind = "rag_qa") => {
        if (!notebookId) return;
        const tpl = templates.find((t) => t.kind === template);
        const label = tpl?.label ?? template;
        try {
            const f = await studioService.createGuideFlow(notebookId, `${label} flow`, { template });
            message.success(`Flow created (${label})`);
            await loadFlows();
            setSelectedId(f.id);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Create failed");
        }
    };

    const resolveDefinitionForSave = (): GuideFlowDefinition | null => {
        if (editorTab === "form") {
            if (!formDef) return null;
            const v = parseGuideFlowDefinition(formDef);
            if (!v.ok) {
                message.error(v.error);
                return null;
            }
            return v.data;
        }
        let raw: unknown;
        try {
            raw = JSON.parse(editorJson) as unknown;
        } catch {
            message.error("Definition must be valid JSON");
            return null;
        }
        const v = parseGuideFlowDefinition(raw);
        if (!v.ok) {
            message.error(v.error);
            return null;
        }
        return v.data;
    };

    const handleValidate = async () => {
        const definition = resolveDefinitionForSave();
        if (!definition) return;
        setValidating(true);
        setValidationMsg(null);
        try {
            const res = await studioService.validateGuideFlow(definition as unknown as Record<string, unknown>);
            if (res.valid) {
                const warn = res.warnings.length ? ` Warnings: ${res.warnings.join("; ")}` : "";
                setValidationMsg(`Valid — ${res.nodeCount} nodes, XState coverage: ${res.xstateCoverage ? "ok" : "warn"}.${warn}`);
                message.success("Definition valid");
            } else {
                setValidationMsg(res.errors.join("; "));
                message.error("Validation failed");
            }
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Validate failed");
        } finally {
            setValidating(false);
        }
    };

    const handleFormDefinitionChange = useCallback((next: GuideFlowDefinition) => {
        setFormDef(next);
        setEditorJson(JSON.stringify(next, null, 2));
    }, []);

    const handleSave = async () => {
        if (!selected) return;
        const definition = resolveDefinitionForSave();
        if (!definition) {
            if (editorTab === "form" && !formDef) {
                message.error("Form editor could not load this definition. Fix JSON or switch to JSON tab.");
            }
            return;
        }
        setSaving(true);
        try {
            await studioService.updateGuideFlow(selected.id, {
                name: flowName.trim() || selected.name,
                definition: definition as unknown as Record<string, unknown>,
            });
            message.success("Saved");
            await loadFlows();
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Save failed");
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
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Publish failed");
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
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Delete failed");
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
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Could not start guided session");
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
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Guided chat failed");
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
            <Alert
                type="info"
                showIcon
                className="!rounded-xl text-xs"
                message="Guide Flow best practices"
                description={
                    <ul className="list-disc pl-4 m-0 space-y-0.5">
                        <li>Gunakan template <strong>RAG Q&A</strong> untuk notebook dokumen (listen → rag → loop).</li>
                        <li>Set <code>meta.flowKind</code> agar runtime memilih routing UMKM vs RAG dengan benar.</li>
                        <li>Setiap <code>listen</code> wajib punya transisi <code>default</code>; validasi graph sebelum publish.</li>
                        <li>Node <code>sql</code> hanya SELECT read-only; <code>action</code> untuk operasi UMKM (WA).</li>
                    </ul>
                }
            />

            <div className="flex flex-wrap items-center gap-2">
                <Dropdown
                    menu={{
                        items: (templates.length ? templates : [
                            { kind: "rag_qa" as const, label: "RAG Q&A", description: "" },
                            { kind: "umkm" as const, label: "UMKM Penjualan", description: "" },
                            { kind: "blank" as const, label: "Kosong", description: "" },
                        ]).map((t) => ({
                            key: t.kind,
                            label: (
                                <div>
                                    <div className="font-medium">{t.label}</div>
                                    {t.description ? (
                                        <div className="text-[10px] text-gray-500">{t.description}</div>
                                    ) : null}
                                </div>
                            ),
                            onClick: () => handleCreate(t.kind as GuideFlowTemplateKind),
                        })),
                    }}
                >
                    <Button type="primary" icon={<PlusOutlined />} style={{ backgroundColor: themeColor }}>
                        New flow <DownOutlined />
                    </Button>
                </Dropdown>
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
                                    <div className="flex justify-between w-full gap-2 items-center">
                                        <Text strong className="text-[13px] truncate">
                                            {item.name}
                                        </Text>
                                        <Space size={4}>
                                            {flowKindFromDef(item.definition) && (
                                                <Tag className="!text-[10px]">{flowKindFromDef(item.definition)}</Tag>
                                            )}
                                            <Tag color={item.status === "published" ? "green" : "default"}>
                                                {item.status}
                                            </Tag>
                                        </Space>
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
                                    icon={<CheckCircleOutlined />}
                                    onClick={handleValidate}
                                    loading={validating}
                                >
                                    Validate
                                </Button>
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
                        <Text type="secondary">Select a flow to edit the definition.</Text>
                    ) : (
                        <div className="flex flex-col gap-2 flex-1 min-h-0">
                            <Input
                                value={flowName}
                                onChange={(e) => setFlowName(e.target.value)}
                                placeholder="Flow name"
                            />
                            <Paragraph type="secondary" className="!text-[11px] !mb-0">
                                Nodes: <code>start</code>, <code>message</code>, <code>listen</code> (keyword /
                                regex / default), <code>rag</code> (query understanding + placeholders),{" "}
                                <code>sql</code> (Dremio SELECT), <code>action</code> (UMKM), <code>end</code>.
                                Runtime: Zod schema + graph validation; XState spec untuk coverage test.
                            </Paragraph>
                            {validationMsg && (
                                <Alert
                                    type={validationMsg.startsWith("Valid") ? "success" : "error"}
                                    message={validationMsg}
                                    className="!text-xs"
                                    closable
                                    onClose={() => setValidationMsg(null)}
                                />
                            )}
                            {formDef && <GuideFlowPreview definition={formDef} />}
                            <Tabs
                                size="small"
                                activeKey={editorTab}
                                onChange={(k) => {
                                    const key = k as "form" | "json";
                                    if (key === "form") {
                                        let raw: unknown;
                                        try {
                                            raw = JSON.parse(editorJson) as unknown;
                                        } catch {
                                            message.error("Invalid JSON — fix the JSON tab before switching to Form.");
                                            return;
                                        }
                                        const v = parseGuideFlowDefinition(raw);
                                        if (!v.ok) {
                                            message.error(v.error);
                                            return;
                                        }
                                        setFormDef(JSON.parse(JSON.stringify(v.data)) as GuideFlowDefinition);
                                    } else {
                                        if (formDef) {
                                            setEditorJson(JSON.stringify(formDef, null, 2));
                                        }
                                    }
                                    setEditorTab(key);
                                }}
                                items={[
                                    {
                                        key: "form",
                                        label: "Form",
                                        children: formDef ? (
                                            <GuideFlowFormEditor value={formDef} onChange={handleFormDefinitionChange} />
                                        ) : (
                                            <Text type="secondary" className="text-xs">
                                                This definition does not match the expected shape. Use the JSON tab to
                                                fix it, then return here.
                                            </Text>
                                        ),
                                    },
                                    {
                                        key: "json",
                                        label: "JSON (advanced)",
                                        children: (
                                            <TextArea
                                                value={editorJson}
                                                onChange={(e) => setEditorJson(e.target.value)}
                                                className="font-mono text-[11px] flex-1"
                                                style={{ minHeight: 280 }}
                                            />
                                        ),
                                    },
                                ]}
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
