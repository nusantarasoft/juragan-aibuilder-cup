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

const DEPTH_COLORS = ["#8b5cf6", "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"];

function colorForDepth(depth: number): string {
    return DEPTH_COLORS[Math.max(0, depth - 1) % DEPTH_COLORS.length];
}

function MindMapNodeCard({ data }: NodeProps) {
    const depth = typeof data.depth === "number" ? data.depth : 1;
    const label = typeof data.label === "string" ? data.label : "";
    const color = colorForDepth(depth);
    const isRoot = depth <= 1;
    return (
        <div
            style={{
                borderLeft: `3px solid ${color}`,
                background: "var(--mm-node-bg, #ffffff)",
                color: "var(--mm-node-fg, #111827)",
                borderRadius: 8,
                padding: isRoot ? "8px 12px" : "6px 10px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                fontSize: isRoot ? 13 : 12,
                fontWeight: isRoot ? 600 : 400,
                maxWidth: 200,
                lineHeight: 1.3,
            }}
        >
            <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
            <span style={{ whiteSpace: "normal", wordBreak: "break-word" }}>{label}</span>
            <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
        </div>
    );
}

const nodeTypes = { mindmap: MindMapNodeCard };

type Props = { markdown: string; height?: number | string };

export default function MindMapView({ markdown, height = 460 }: Props) {
    const { nodes, edges } = useMemo(() => {
        const parsed = parseMindMapMarkdown(markdown);
        const flow = mindMapToFlow(parsed);
        return {
            nodes: flow.nodes as unknown as Node[],
            edges: flow.edges.map((e) => ({
                ...e,
                type: "smoothstep",
                animated: false,
                style: { stroke: "#c4b5fd", strokeWidth: 1.5 },
            })) as unknown as Edge[],
        };
    }, [markdown]);

    if (nodes.length === 0) {
        return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Mind map kosong" />;
    }

    return (
        <div style={{ width: "100%", height }} className="rounded-lg border border-gray-200 dark:border-gray-700">
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
            >
                <Background gap={16} color="#e5e7eb" />
                <Controls showInteractive={false} />
                <MiniMap
                    pannable
                    zoomable
                    nodeColor={(n) =>
                        colorForDepth(typeof n.data?.depth === "number" ? (n.data.depth as number) : 1)
                    }
                    style={{ height: 90, width: 130 }}
                />
            </ReactFlow>
        </div>
    );
}
