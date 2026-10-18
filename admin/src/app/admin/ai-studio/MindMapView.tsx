"use client";

import React, { useMemo } from "react";
import {
    Background,
    Controls,
    Handle,
    MiniMap,
    Position,
    ReactFlow,
    type Edge,
    type Node,
    type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Empty } from "antd";
import { mindMapToFlow, parseMindMapMarkdown } from "./mindMap";
import { useAdminLayout } from "@/components/layout/CMSLayoutContext";
import { getVOTheme } from "@/components/layout/voTheme";

const DEPTH_COLORS = ["#fb923c", "#38bdf8", "#a855f7", "#10b981", "#f59e0b", "#ef4444"];

function colorForDepth(depth: number): string {
    return DEPTH_COLORS[Math.max(0, depth - 1) % DEPTH_COLORS.length];
}

function MindMapNodeCard({ data }: NodeProps) {
    const darkMode = useAdminLayout((s) => s.darkMode);
    const t = getVOTheme(darkMode);
    const depth = typeof data.depth === "number" ? data.depth : 1;
    const label = typeof data.label === "string" ? data.label : "";
    const clickable = data.clickable === true;
    const color = colorForDepth(depth);
    const isRoot = depth <= 1;
    return (
        <div
            title={clickable ? "Click to ask in chat" : undefined}
            style={{
                border: `1px solid ${t.border}`,
                borderLeft: `3px solid ${color}`,
                background: t.cardBg,
                color: t.textPrimary,
                borderRadius: 0,
                padding: isRoot ? "8px 12px" : "6px 10px",
                fontSize: isRoot ? 13 : 12,
                fontWeight: isRoot ? 600 : 400,
                maxWidth: 210,
                lineHeight: 1.3,
                cursor: clickable ? "pointer" : "grab",
            }}
        >
            <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
            <span style={{ whiteSpace: "normal", wordBreak: "break-word" }}>{label}</span>
            <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
        </div>
    );
}

const nodeTypes = { mindmap: MindMapNodeCard };

type Props = {
    markdown: string;
    height?: number | string;
    onNodeAsk?: (label: string) => void;
};

export default function MindMapView({ markdown, height = 460, onNodeAsk }: Props) {
    const darkMode = useAdminLayout((s) => s.darkMode);
    const t = getVOTheme(darkMode);

    const { nodes, edges } = useMemo(() => {
        const parsed = parseMindMapMarkdown(markdown);
        const flow = mindMapToFlow(parsed);
        return {
            nodes: flow.nodes.map((n) => ({
                ...n,
                data: { ...n.data, clickable: Boolean(onNodeAsk) },
            })) as unknown as Node[],
            edges: flow.edges.map((e) => ({
                ...e,
                type: "smoothstep",
                animated: false,
                style: { stroke: darkMode ? "#475569" : "#94a3b8", strokeWidth: 1.5 },
            })) as unknown as Edge[],
        };
    }, [markdown, onNodeAsk, darkMode]);

    if (nodes.length === 0) {
        return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Empty mind map" />;
    }

    return (
        <div
            style={{ width: "100%", height, background: t.surfaceBg, border: `1px solid ${t.border}` }}
            className="rounded-none"
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.2}
                maxZoom={1.5}
                proOptions={{ hideAttribution: true }}
                nodesDraggable
                nodesConnectable={false}
                elementsSelectable
                onNodeClick={
                    onNodeAsk
                        ? (_, node) => {
                              const label = typeof node.data?.label === "string" ? node.data.label : "";
                              if (label) onNodeAsk(label);
                          }
                        : undefined
                }
            >
                <Background gap={16} color={darkMode ? "#1e293b" : "#e2e8f0"} />
                <Controls showInteractive={false} />
                <MiniMap
                    pannable
                    zoomable
                    nodeColor={(n) =>
                        colorForDepth(typeof n.data?.depth === "number" ? (n.data.depth as number) : 1)
                    }
                    style={{ height: 90, width: 130, background: t.cardBg, border: `1px solid ${t.border}` }}
                />
            </ReactFlow>
        </div>
    );
}
