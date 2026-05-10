"use client";

import React, { useMemo } from "react";
import {
    Button,
    Card,
    Collapse,
    Input,
    Select,
    Space,
    Typography,
} from "antd";
import { DeleteOutlined, PlusOutlined, UpOutlined, DownOutlined } from "@ant-design/icons";

const { Text } = Typography;
const { TextArea } = Input;

export type ListenWhen = "keyword" | "regex" | "default";

export type ListenTransition =
    | { when: "keyword"; value: string; target: string }
    | { when: "regex"; pattern: string; target: string }
    | { when: "default"; target: string };

export type GuideFlowNode =
    | { id: string; type: "start"; next: string }
    | { id: string; type: "message"; content: string; next: string }
    | { id: string; type: "listen"; transitions: ListenTransition[] }
    | { id: string; type: "rag"; instruction: string; next: string }
    | { id: string; type: "end" };

export type GuideFlowDefinition = {
    version: 1;
    startNodeId: string;
    nodes: GuideFlowNode[];
};

function cloneDef(d: GuideFlowDefinition): GuideFlowDefinition {
    return JSON.parse(JSON.stringify(d)) as GuideFlowDefinition;
}

function newId(prefix: string, existing: Set<string>): string {
    let id = `${prefix}_${Date.now()}`;
    let n = 0;
    while (existing.has(id)) id = `${prefix}_${Date.now()}_${n++}`;
    existing.add(id);
    return id;
}

export function parseGuideFlowDefinition(raw: unknown): { ok: true; data: GuideFlowDefinition } | { ok: false; error: string } {
    if (!raw || typeof raw !== "object") return { ok: false, error: "Definition must be an object" };
    const o = raw as Record<string, unknown>;
    if (o.version !== 1) return { ok: false, error: 'version must be 1' };
    if (typeof o.startNodeId !== "string" || !o.startNodeId) return { ok: false, error: "startNodeId is required" };
    if (!Array.isArray(o.nodes) || o.nodes.length === 0) return { ok: false, error: "nodes must be a non-empty array" };
    const nodes: GuideFlowNode[] = [];
    for (const n of o.nodes) {
        if (!n || typeof n !== "object") return { ok: false, error: "Invalid node entry" };
        const node = n as Record<string, unknown>;
        if (typeof node.id !== "string" || !node.id) return { ok: false, error: "Each node needs a non-empty id" };
        const t = node.type;
        if (t === "start") {
            if (typeof node.next !== "string") return { ok: false, error: `Node ${node.id}: start needs next` };
            nodes.push({ id: node.id, type: "start", next: node.next });
        } else if (t === "message") {
            if (typeof node.content !== "string") return { ok: false, error: `Node ${node.id}: message needs content` };
            if (typeof node.next !== "string") return { ok: false, error: `Node ${node.id}: message needs next` };
            nodes.push({ id: node.id, type: "message", content: node.content, next: node.next });
        } else if (t === "listen") {
            if (!Array.isArray(node.transitions) || node.transitions.length === 0) {
                return { ok: false, error: `Node ${node.id}: listen needs transitions` };
            }
            const trs: ListenTransition[] = [];
            for (const tr of node.transitions) {
                if (!tr || typeof tr !== "object") return { ok: false, error: `Node ${node.id}: invalid transition` };
                const w = (tr as Record<string, unknown>).when;
                if (w === "keyword") {
                    const value = String((tr as Record<string, unknown>).value ?? "");
                    const target = String((tr as Record<string, unknown>).target ?? "");
                    trs.push({ when: "keyword", value, target });
                } else if (w === "regex") {
                    const pattern = String((tr as Record<string, unknown>).pattern ?? "");
                    const target = String((tr as Record<string, unknown>).target ?? "");
                    trs.push({ when: "regex", pattern, target });
                } else if (w === "default") {
                    const target = String((tr as Record<string, unknown>).target ?? "");
                    trs.push({ when: "default", target });
                } else return { ok: false, error: `Node ${node.id}: unknown transition when` };
            }
            if (!trs.some((x) => x.when === "default")) {
                return { ok: false, error: `Node ${node.id}: listen must include a default transition` };
            }
            nodes.push({ id: node.id, type: "listen", transitions: trs });
        } else if (t === "rag") {
            if (typeof node.instruction !== "string") return { ok: false, error: `Node ${node.id}: rag needs instruction` };
            if (typeof node.next !== "string") return { ok: false, error: `Node ${node.id}: rag needs next` };
            nodes.push({ id: node.id, type: "rag", instruction: node.instruction, next: node.next });
        } else if (t === "end") {
            nodes.push({ id: node.id, type: "end" });
        } else return { ok: false, error: `Node ${node.id}: unknown type` };
    }
    const ids = new Set(nodes.map((x) => x.id));
    if (ids.size !== nodes.length) return { ok: false, error: "Duplicate node ids" };
    if (!ids.has(o.startNodeId)) return { ok: false, error: "startNodeId must match a node id" };
    const startNodes = nodes.filter((x) => x.type === "start");
    if (startNodes.length === 0) return { ok: false, error: "Graph needs at least one start node" };
    for (const node of nodes) {
        if (node.type === "start" || node.type === "message" || node.type === "rag") {
            if (!ids.has(node.next)) return { ok: false, error: `Node ${node.id}: next "${node.next}" is not a node id` };
        }
        if (node.type === "listen") {
            for (const tr of node.transitions) {
                const tgt = tr.when === "default" ? tr.target : tr.target;
                if (!ids.has(tgt)) return { ok: false, error: `Node ${node.id}: transition target "${tgt}" is not a node id` };
            }
        }
    }
    return { ok: true, data: { version: 1, startNodeId: o.startNodeId, nodes } };
}

type Props = {
    value: GuideFlowDefinition;
    onChange: (next: GuideFlowDefinition) => void;
};

const NODE_TYPES: GuideFlowNode["type"][] = ["start", "message", "listen", "rag", "end"];

export default function GuideFlowFormEditor({ value, onChange }: Props) {
    const idOptions = useMemo(
        () => value.nodes.map((n) => ({ label: `${n.id} (${n.type})`, value: n.id })),
        [value.nodes],
    );

    const updateNode = (index: number, node: GuideFlowNode) => {
        const nodes = [...value.nodes];
        nodes[index] = node;
        onChange({ ...value, nodes });
    };

    const removeNode = (index: number) => {
        const node = value.nodes[index];
        const nodes = value.nodes.filter((_, i) => i !== index);
        let startNodeId = value.startNodeId;
        if (startNodeId === node.id && nodes.length) {
            const firstStart = nodes.find((n) => n.type === "start");
            startNodeId = firstStart?.id ?? nodes[0].id;
        }
        onChange({ ...value, nodes, startNodeId });
    };

    const moveNode = (index: number, dir: -1 | 1) => {
        const j = index + dir;
        if (j < 0 || j >= value.nodes.length) return;
        const nodes = [...value.nodes];
        [nodes[index], nodes[j]] = [nodes[j], nodes[index]];
        onChange({ ...value, nodes });
    };

    const addNode = (type: GuideFlowNode["type"]) => {
        const existing = new Set(value.nodes.map((n) => n.id));
        const firstOther = value.nodes[0]?.id ?? "";
        let node: GuideFlowNode;
        switch (type) {
            case "start":
                node = { id: newId("start", existing), type: "start", next: firstOther };
                break;
            case "message":
                node = { id: newId("msg", existing), type: "message", content: "", next: firstOther };
                break;
            case "listen":
                node = {
                    id: newId("listen", existing),
                    type: "listen",
                    transitions: [{ when: "default", target: firstOther }],
                };
                break;
            case "rag":
                node = {
                    id: newId("rag", existing),
                    type: "rag",
                    instruction: "Answer using sources. Question:\n{{lastUserMessage}}",
                    next: firstOther,
                };
                break;
            case "end":
                node = { id: newId("end", existing), type: "end" };
                break;
        }
        onChange({ ...value, nodes: [...value.nodes, node] });
    };

    const changeNodeType = (index: number, newType: GuideFlowNode["type"]) => {
        const old = value.nodes[index];
        const existing = new Set(value.nodes.map((n) => n.id));
        const firstOther = value.nodes.find((n) => n.id !== old.id)?.id ?? "";
        let node: GuideFlowNode;
        switch (newType) {
            case "start":
                node = { id: old.id, type: "start", next: "next" in old ? old.next : firstOther };
                break;
            case "message":
                node = { id: old.id, type: "message", content: "content" in old ? old.content : "", next: "next" in old ? old.next : firstOther };
                break;
            case "listen":
                node = {
                    id: old.id,
                    type: "listen",
                    transitions: [{ when: "default", target: firstOther }],
                };
                break;
            case "rag":
                node = {
                    id: old.id,
                    type: "rag",
                    instruction: "instruction" in old ? old.instruction : "",
                    next: "next" in old ? old.next : firstOther,
                };
                break;
            case "end":
                node = { id: old.id, type: "end" };
                break;
        }
        updateNode(index, node);
    };

    const renderNodeFields = (node: GuideFlowNode, index: number) => {
        if (node.type === "start" || node.type === "message" || node.type === "rag") {
            return (
                <Space direction="vertical" className="w-full" size={8}>
                    {node.type === "message" && (
                        <div>
                            <Text className="text-xs text-gray-500">Message text</Text>
                            <TextArea
                                rows={3}
                                value={node.content}
                                onChange={(e) => updateNode(index, { ...node, content: e.target.value })}
                            />
                        </div>
                    )}
                    {node.type === "rag" && (
                        <div>
                            <Text className="text-xs text-gray-500">RAG instruction (placeholders: lastUserMessage, rewrittenQuery, …)</Text>
                            <TextArea
                                rows={5}
                                className="font-mono text-[11px]"
                                value={node.instruction}
                                onChange={(e) => updateNode(index, { ...node, instruction: e.target.value })}
                            />
                        </div>
                    )}
                    <div>
                        <Text className="text-xs text-gray-500">Next node</Text>
                        <Select
                            className="w-full"
                            value={node.next || undefined}
                            options={idOptions}
                            onChange={(next) => updateNode(index, { ...node, next })}
                            showSearch
                            optionFilterProp="label"
                        />
                    </div>
                </Space>
            );
        }
        if (node.type === "listen") {
            return (
                <Space direction="vertical" className="w-full" size={8}>
                    <Text className="text-xs text-gray-500">Transitions (order: keyword/regex first, then default)</Text>
                    {node.transitions.map((tr, ti) => (
                        <Card key={ti} size="small" className="!rounded-lg bg-gray-50 dark:bg-gray-900/30">
                            <Space wrap className="w-full">
                                <Select
                                    value={tr.when}
                                    style={{ width: 110 }}
                                    options={[
                                        { value: "keyword", label: "keyword" },
                                        { value: "regex", label: "regex" },
                                        { value: "default", label: "default" },
                                    ]}
                                    onChange={(when) => {
                                        const nextTrs = [...node.transitions];
                                        if (when === "keyword") {
                                            nextTrs[ti] = { when: "keyword", value: "", target: tr.target };
                                        } else if (when === "regex") {
                                            nextTrs[ti] = { when: "regex", pattern: "", target: tr.target };
                                        } else {
                                            nextTrs[ti] = { when: "default", target: tr.target };
                                        }
                                        updateNode(index, { ...node, transitions: nextTrs });
                                    }}
                                />
                                {tr.when === "keyword" && (
                                    <Input
                                        placeholder="keyword"
                                        value={tr.value}
                                        onChange={(e) => {
                                            const nextTrs = [...node.transitions];
                                            (nextTrs[ti] as { when: "keyword"; value: string; target: string }).value = e.target.value;
                                            updateNode(index, { ...node, transitions: nextTrs });
                                        }}
                                        style={{ width: 140 }}
                                    />
                                )}
                                {tr.when === "regex" && (
                                    <Input
                                        placeholder="pattern"
                                        value={tr.pattern}
                                        onChange={(e) => {
                                            const nextTrs = [...node.transitions];
                                            (nextTrs[ti] as { when: "regex"; pattern: string; target: string }).pattern = e.target.value;
                                            updateNode(index, { ...node, transitions: nextTrs });
                                        }}
                                        style={{ width: 180 }}
                                    />
                                )}
                                <Select
                                    placeholder="target node"
                                    style={{ minWidth: 160 }}
                                    value={tr.target || undefined}
                                    options={idOptions}
                                    onChange={(target) => {
                                        const nextTrs = [...node.transitions];
                                        if (nextTrs[ti].when === "default") {
                                            nextTrs[ti] = { when: "default", target };
                                        } else if (nextTrs[ti].when === "keyword") {
                                            nextTrs[ti] = { ...nextTrs[ti], target };
                                        } else {
                                            nextTrs[ti] = { ...nextTrs[ti], target };
                                        }
                                        updateNode(index, { ...node, transitions: nextTrs });
                                    }}
                                    showSearch
                                    optionFilterProp="label"
                                />
                                <Button
                                    type="text"
                                    danger
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    disabled={node.transitions.length <= 1}
                                    onClick={() => {
                                        const nextTrs = node.transitions.filter((_, i) => i !== ti);
                                        if (!nextTrs.some((x) => x.when === "default")) {
                                            nextTrs.push({ when: "default", target: idOptions[0]?.value ?? "" });
                                        }
                                        updateNode(index, { ...node, transitions: nextTrs });
                                    }}
                                />
                            </Space>
                        </Card>
                    ))}
                    <Button
                        type="dashed"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            const first = idOptions[0]?.value ?? "";
                            updateNode(index, {
                                ...node,
                                transitions: [...node.transitions, { when: "keyword", value: "", target: first }],
                            });
                        }}
                    >
                        Add transition
                    </Button>
                </Space>
            );
        }
        if (node.type === "end") {
            return <Text type="secondary" className="text-xs">Terminal node (no outgoing edges).</Text>;
        }
        return null;
    };

    return (
        <div className="flex flex-col gap-3 min-h-0">
            <Space wrap align="center">
                <Text className="text-xs text-gray-500">Start node</Text>
                <Select
                    style={{ minWidth: 200 }}
                    value={value.startNodeId || undefined}
                    options={value.nodes.filter((n) => n.type === "start").map((n) => ({ label: n.id, value: n.id }))}
                    onChange={(startNodeId) => onChange({ ...value, startNodeId })}
                    placeholder="Pick start node id"
                />
                <Space wrap size={[4, 4]}>
                    {NODE_TYPES.map((t) => (
                        <Button key={t} size="small" type="dashed" onClick={() => addNode(t)}>
                            + {t}
                        </Button>
                    ))}
                </Space>
            </Space>

            <Collapse
                size="small"
                className="flex-1 overflow-auto max-h-[420px] custom-scrollbar"
                items={value.nodes.map((node, index) => ({
                    key: node.id,
                    label: (
                        <Space>
                            <Text strong className="text-xs">{node.id}</Text>
                            <Text type="secondary" className="text-xs">({node.type})</Text>
                        </Space>
                    ),
                    extra: (
                        <Space size={0} onClick={(e) => e.stopPropagation()}>
                            <Button type="text" size="small" icon={<UpOutlined />} onClick={() => moveNode(index, -1)} disabled={index === 0} />
                            <Button type="text" size="small" icon={<DownOutlined />} onClick={() => moveNode(index, 1)} disabled={index === value.nodes.length - 1} />
                            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeNode(index)} />
                        </Space>
                    ),
                    children: (
                        <Space direction="vertical" className="w-full pt-1" size={10}>
                            <Space wrap>
                                <Text className="text-xs w-14">Id</Text>
                                <Input
                                    size="small"
                                    className="max-w-[200px]"
                                    value={node.id}
                                    onChange={(e) => {
                                        const newId = e.target.value;
                                        const nodes = value.nodes.map((n, i) =>
                                            i === index ? { ...n, id: newId } as GuideFlowNode : n,
                                        );
                                        let startNodeId = value.startNodeId;
                                        if (startNodeId === node.id) startNodeId = newId;
                                        const relink = (tid: string) => {
                                            if (tid === node.id) return newId;
                                            return tid;
                                        };
                                        const fixed = nodes.map((n) => {
                                            if (n.type === "start" || n.type === "message" || n.type === "rag") {
                                                return { ...n, next: relink(n.next) };
                                            }
                                            if (n.type === "listen") {
                                                return {
                                                    ...n,
                                                    transitions: n.transitions.map((tr) => ({
                                                        ...tr,
                                                        target: relink(tr.target),
                                                    })),
                                                };
                                            }
                                            return n;
                                        }) as GuideFlowNode[];
                                        onChange({ ...value, nodes: fixed, startNodeId });
                                    }}
                                />
                                <Text className="text-xs">Type</Text>
                                <Select
                                    size="small"
                                    style={{ width: 120 }}
                                    value={node.type}
                                    options={NODE_TYPES.map((t) => ({ value: t, label: t }))}
                                    onChange={(t) => changeNodeType(index, t as GuideFlowNode["type"])}
                                />
                            </Space>
                            {renderNodeFields(node, index)}
                        </Space>
                    ),
                }))}
            />
        </div>
    );
}
