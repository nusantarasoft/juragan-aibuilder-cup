"use client";

import React from "react";
import { BookOpen, Bot, Brain, LayoutDashboard, ListTodo, Network, Settings2, ShieldCheck, Timer, Workflow, type LucideIcon } from "lucide-react";
import { AgentStudio } from "./apps/AgentStudio";
import { BrainGraph } from "./apps/BrainGraph";
import { GovernanceApp } from "./apps/Governance";
import { MemoryMap } from "./apps/MemoryMap";
import { Playbooks } from "./apps/Playbooks";
import { Pulse } from "./apps/Pulse";
import { OsSettingsApp } from "./apps/SystemApps";
import { CommandDeck } from "./apps/deck/CommandDeck";
import { TaskManager } from "./apps/TaskManager";
import { Workflows } from "./apps/Workflows";
import type { AppId, AppParams } from "./lib/osUi";

export { useOsUi } from "./lib/osUi";
export type { AppId, AppParams } from "./lib/osUi";

export interface AppDef {
    id: AppId;
    name: string;
    icon: LucideIcon;
    color: string;
    layer?: "M" | "A" | "P" | "S";
    description: string;
    soon?: boolean;
    render: (params: AppParams, open: (app: AppId, params?: AppParams) => void) => React.ReactNode;
}

export const APPS: AppDef[] = [
    {
        id: "overview", name: "Overview", icon: LayoutDashboard, color: "#38bdf8", layer: "S",
        description: "KPIs, agents at work, Pulse and live activity",
        render: (_p, open) => <CommandDeck onOpen={(a, p) => open(a as AppId, p)} />,
    },
    {
        id: "studio", name: "Agent Studio", icon: Bot, color: "#818cf8", layer: "A",
        description: "Create, customize, test, clone and archive agents",
        render: (p, open) => <AgentStudio initialAgentId={p.agentId} onOpenTasks={(agentId) => open("tasks", { agentId })} />,
    },
    {
        id: "tasks", name: "Tasks", icon: ListTodo, color: "#22d3ee",
        description: "Add, edit, reorder and confirm tasks per agent",
        render: (p) => <TaskManager initialAgentId={p.agentId} />,
    },
    {
        id: "playbooks", name: "Playbooks", icon: BookOpen, color: "#34d399",
        description: "Reusable task scripts per module",
        render: () => <Playbooks />,
    },
    {
        id: "pulse", name: "Pulse", icon: Timer, color: "#fb923c", layer: "P",
        description: "Routines, run queue, caps & the run log",
        render: (p) => <Pulse initialTab={p.tab} initialRoutineId={p.routineId} />,
    },
    {
        id: "governance", name: "Governance", icon: ShieldCheck, color: "#f59e0b",
        description: "Approvals, permission matrix, audit log & violations",
        render: (p) => <GovernanceApp initialTab={p.tab} />,
    },
    {
        id: "memory", name: "Memory Map", icon: Brain, color: "#e879f9", layer: "M",
        description: "Areas, signposts and items agents can find in two hops",
        render: (p) => <MemoryMap initialTab={p.tab} initialAreaId={p.areaId} />,
    },
    {
        id: "workflows", name: "Workflows", icon: Workflow, color: "#a855f7",
        description: "Multi-agent chains with hand-offs and approval gates",
        render: (p) => <Workflows initialWorkflowId={p.workflowId} initialRunId={p.runId} initialTab={p.tab} />,
    },
    {
        id: "brain", name: "Brain", icon: Network, color: "#2dd4bf", layer: "S",
        description: "Read-only screens: constellation, schedule, timeline, health",
        render: (p, open) => <BrainGraph initialView={p.view} onOpen={open} />,
    },
    {
        id: "settings", name: "Settings", icon: Settings2, color: "#94a3b8",
        description: "Kill switch, autopilot, caps and budgets",
        render: () => <OsSettingsApp />,
    },
];

export const APP_BY_ID = Object.fromEntries(APPS.map((a) => [a.id, a])) as Record<AppId, AppDef>;
