"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { AppId } from "@/components/agentic-os/registry";
import { AgenticOsWorkspace } from "@/components/agentic-os/AgenticOsWorkspace";

const APP_IDS: AppId[] = ["overview", "studio", "tasks", "playbooks", "governance", "memory", "pulse", "workflows", "brain", "settings"];

/** URL query key → app param key (kept in sync by AgenticOsWorkspace). */
const URL_PARAMS: [string, string][] = [
    ["agent", "agentId"],
    ["tab", "tab"],
    ["routine", "routineId"],
    ["area", "areaId"],
    ["workflow", "workflowId"],
    ["run", "runId"],
    ["view", "view"],
];

function Workspace() {
    const sp = useSearchParams();
    const app = sp.get("app") as AppId | null;
    const params: Record<string, string> = {};
    for (const [q, key] of URL_PARAMS) {
        const v = sp.get(q);
        if (v) params[key] = v;
    }
    return <AgenticOsWorkspace initialApp={app && APP_IDS.includes(app) ? app : "overview"} initialParams={params} />;
}

export default function AgenticOsPage() {
    return (
        <Suspense fallback={null}>
            <Workspace />
        </Suspense>
    );
}

