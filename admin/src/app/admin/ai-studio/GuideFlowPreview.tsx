"use client";

import React, { useMemo } from "react";
import { Tag, Typography } from "antd";
import type { GuideFlowDefinition } from "./GuideFlowFormEditor";

const { Text } = Typography;

const NODE_COLORS: Record<string, string> = {
    start: "blue",
    message: "default",
    listen: "purple",
    rag: "green",
    sql: "cyan",
    action: "orange",
    end: "red",
};

export function buildGuideFlowEdges(def: GuideFlowDefinition): string[] {
    const lines: string[] = [];
    for (const n of def.nodes) {
        if (
            n.type === "start" ||
            n.type === "message" ||
            n.type === "rag" ||
            n.type === "sql" ||
            n.type === "action"
        ) {
            lines.push(`${n.id} → ${n.next}`);
        } else if (n.type === "listen") {
            for (const t of n.transitions) {
                const cond =
                    t.when === "default"
                        ? "default"
                        : t.when === "keyword"
                          ? `"${t.value}"`
                          : `/${t.pattern}/`;
                lines.push(`${n.id} --[${cond}]--> ${t.target}`);
            }
        }
    }
    return lines;
}

type Props = {
    definition: GuideFlowDefinition;
};

export default function GuideFlowPreview({ definition }: Props) {
    const edges = useMemo(() => buildGuideFlowEdges(definition), [definition]);
    const flowKind = definition.meta?.flowKind;

    return (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50/80 dark:bg-gray-900/30">
            <div className="flex flex-wrap items-center gap-2 mb-2">
                <Text className="text-xs text-gray-500">Flow preview</Text>
                {flowKind && <Tag color="geekblue">{flowKind}</Tag>}
                <Text type="secondary" className="text-[10px]">
                    {definition.nodes.length} nodes · start: {definition.startNodeId}
                </Text>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
                {definition.nodes.map((n) => (
                    <Tag
                        key={n.id}
                        color={NODE_COLORS[n.type] ?? "default"}
                        className="!text-[10px] !m-0"
                    >
                        {n.id}
                    </Tag>
                ))}
            </div>
            <pre className="text-[10px] font-mono leading-relaxed m-0 max-h-[120px] overflow-auto custom-scrollbar text-gray-600 dark:text-gray-400">
                {edges.join("\n")}
            </pre>
        </div>
    );
}
