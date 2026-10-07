"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Box, Monitor } from "lucide-react";
import CMSLayout from "@/components/layout/CMSLayout";
import type { AppId } from "@/components/agentic-os/registry";

const AgenticOsWorkspace = dynamic(() => import("@/components/agentic-os/AgenticOsWorkspace").then((m) => m.AgenticOsWorkspace), { ssr: false });

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
        <CMSLayout
            title={
                <span className="flex items-center gap-2">
                    <Box className="h-5 w-5 text-indigo-500" /> Agentic OS
                </span>
            }
            subTitle="Customize, task and govern your AI agents — MAPS: Memory · Agent · Pulse · Screen"
            extra={[
                <Link
                    key="office"
                    href="/admin/virtual-office"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-indigo-500"
                >
                    <Monitor className="h-4 w-4" /> Enter Virtual Office
                </Link>,
            ]}
        >
            <Suspense fallback={null}>
                <Workspace />
            </Suspense>
        </CMSLayout>
    );
}
