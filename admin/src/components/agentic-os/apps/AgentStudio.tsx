"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Bot, Plus, Search, Users } from "lucide-react";
import { MODULES, type ModuleId } from "@/app/admin/virtual-office/lib/modules";
import { ZONE_BY_ID } from "@/app/admin/virtual-office/lib/floorplan";
import type { ZoneId } from "@/app/admin/virtual-office/lib/types";
import { AGENT_TEMPLATES, TIER_META, slugify, type AgentTemplate } from "../lib/catalog";
import { fetchKasirLiveSnapshot } from "../lib/api";
import { formatKasirMetricLine, KASIR_EMPLOYEE_SLUG, rosterKindForAgent } from "../lib/firstEmployee";
import { useAosStore } from "../lib/store";
import type { OsAgent, OsKasirLiveSnapshot } from "../lib/types";
import { AgentDot, Button, Chip, EmptyState, Toggle, cx } from "../ui/kit";
import { RosterKindBadge } from "../ui/RosterKindBadge";
import { AgentEditor, type AgentDraft } from "./AgentEditor";

function draftFromTemplate(t: AgentTemplate): AgentDraft {
    return {
        name: t.name,
        slug: "",
        role: t.role,
        description: "",
        persona: t.persona,
        systemPrompt: "",
        provider: "default",
        model: "default",
        modelTier: t.modelTier,
        temperature: 0.3,
        effort: t.modelTier === "large" ? "high" : t.modelTier === "small" ? "low" : "medium",
        color: t.color,
        avatar: {},
        zone: t.zone,
        deskId: null,
        modules: [...t.modules],
        skills: [...t.skills],
        tools: [...t.tools],
        permissions: Object.fromEntries(t.modules.map((m, i) => [m, i === 0 ? "write" : "draft"])),
        guardrails: { denySend: true, denyShare: true, denyDelete: true, requireApproval: [] },
        memoryScope: [],
        runner: "cloud",
        dailyTokenBudget: 500000,
        dailyRunBudget: 20,
        status: "active",
    };
}

export function AgentStudio({ initialAgentId, onOpenTasks }: { initialAgentId?: string; onOpenTasks?: (agentId: string) => void }) {
    const { agents, tasks, includeArchived, setIncludeArchived } = useAosStore(
        useShallow((s) => ({
            agents: s.agents,
            tasks: s.tasks,
            includeArchived: s.includeArchived,
            setIncludeArchived: s.setIncludeArchived,
        })),
    );
    const [selected, setSelected] = useState<string | null>(() => {
        const a = agents.find((x) => x.id === initialAgentId || x.slug === initialAgentId);
        return a?.id ?? null;
    });
    const [creating, setCreating] = useState<AgentDraft | null>(null);
    const [showTemplates, setShowTemplates] = useState(false);
    const [query, setQuery] = useState("");
    const [zone, setZone] = useState<string>("all");
    const [kasirLive, setKasirLive] = useState<OsKasirLiveSnapshot | null>(null);

    useEffect(() => {
        let alive = true;
        const unavailable: OsKasirLiveSnapshot = {
            available: false,
            tenantId: "default",
            slug: KASIR_EMPLOYEE_SLUG,
            name: "Kasir UMKM",
            role: "UMKM WhatsApp Kasir",
            source: "ai_studio",
            unavailableReason: "data tidak tersedia",
            waChatsToday: null,
            transactionsToday: null,
            lastActivityAt: null,
            waOnline: null,
        };
        const load = () =>
            fetchKasirLiveSnapshot()
                .then((s) => alive && setKasirLive(s))
                .catch(() => alive && setKasirLive(unavailable));
        void load();
        const t = setInterval(load, 5000);
        return () => {
            alive = false;
            clearInterval(t);
        };
    }, []);

    // Resolve the deep link once agents are loaded.
    const [linked, setLinked] = useState(false);
    if (!linked && initialAgentId && agents.length) {
        const a = agents.find((x) => x.id === initialAgentId || x.slug === initialAgentId);
        setLinked(true);
        if (a && selected !== a.id) setSelected(a.id);
    }

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return agents
            .filter((a) => (includeArchived ? true : !a.archivedAt))
            .filter((a) => zone === "all" || a.zone === zone)
            .filter((a) => !q || a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q) || a.skills.some((s) => s.toLowerCase().includes(q)));
    }, [agents, query, zone, includeArchived]);

    const openCount = (id: string) => tasks.filter((t) => t.agentId === id && ["queued", "running", "awaiting_approval", "review"].includes(t.status)).length;
    const agent = agents.find((a) => a.id === selected);

    const startCreate = (t: AgentTemplate) => {
        const d = draftFromTemplate(t);
        let name = t.name;
        let n = 2;
        while (agents.some((a) => a.slug === slugify(name))) name = `${t.name} ${n++}`;
        d.name = name;
        setCreating(d);
        setSelected(null);
        setShowTemplates(false);
    };

    const onSaved = (a: OsAgent) => {
        setCreating(null);
        setSelected(a.id);
    };

    return (
        <div className="flex h-full min-h-0">
            {/* Gallery */}
            <aside className="flex w-[290px] shrink-0 flex-col border-r border-white/10">
                <div className="space-y-2 border-b border-white/10 p-3">
                    <div className="flex items-center gap-2">
                        <label className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 focus-within:border-indigo-400/50">
                            <Search className="h-3.5 w-3.5 text-slate-500" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.stopPropagation()}
                                placeholder="Search agents, roles, skills…"
                                className="w-full bg-transparent text-[12px] text-white placeholder:text-slate-500 focus:outline-none"
                            />
                        </label>
                        <Button variant="primary" icon={Plus} onClick={() => setShowTemplates((v) => !v)} title="New agent" />
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {["all", "engineering", "research", "operations"].map((z) => (
                            <Chip key={z} color={z === "all" ? "#94a3b8" : ZONE_BY_ID[z as ZoneId].color} active={zone === z} onClick={() => setZone(z)}>
                                {z === "all" ? `All ${agents.filter((a) => !a.archivedAt).length}` : ZONE_BY_ID[z as ZoneId].name}
                            </Chip>
                        ))}
                    </div>
                    <Toggle checked={includeArchived} onChange={setIncludeArchived} label="Show archived" />
                </div>

                {showTemplates && (
                    <div className="space-y-1 border-b border-white/10 bg-indigo-500/[0.06] p-2">
                        <div className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-indigo-200">Start from a template</div>
                        {AGENT_TEMPLATES.map((t) => (
                            <button key={t.id} type="button" onClick={() => startCreate(t)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/10">
                                <AgentDot color={t.color} name={t.role} size={24} />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[12px] font-medium text-white">{t.id === "blank" ? "Blank agent" : t.role}</span>
                                    <span className="block truncate text-[10px] text-slate-500">{t.modules.map((m) => MODULES[m as ModuleId]?.name ?? m).join(" · ")}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
                    {kasirLive && (
                        <div className="mb-2 space-y-1 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.06] p-2.5">
                            <div className="flex items-center gap-2">
                                <AgentDot color="#22c55e" name={kasirLive.name} size={28} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="truncate text-[13px] font-semibold text-white">{kasirLive.name}</span>
                                        <RosterKindBadge kind="live" />
                                        <Chip color="#38bdf8">AI Studio</Chip>
                                    </div>
                                    <div className="truncate text-[11px] text-slate-400">{kasirLive.role}</div>
                                    <div className="mt-1 text-[10px] leading-snug text-slate-300">{formatKasirMetricLine(kasirLive)}</div>
                                </div>
                            </div>
                            <div className="text-[10px] text-slate-500">First recruited employee · read-only tenant metrics</div>
                        </div>
                    )}
                    {visible.map((a) => {
                        const open = openCount(a.id);
                        const kind = rosterKindForAgent(a.id, a.slug);
                        return (
                            <button
                                key={a.id}
                                type="button"
                                onClick={() => {
                                    setSelected(a.id);
                                    setCreating(null);
                                }}
                                className={cx(
                                    "flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition",
                                    selected === a.id && !creating ? "border-white/20 bg-white/10" : "border-transparent hover:bg-white/5",
                                    a.archivedAt && "opacity-50",
                                )}
                            >
                                <AgentDot color={a.color} name={a.name} />
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1.5">
                                        <span className="truncate text-[13px] font-semibold text-white">{a.name}</span>
                                        <RosterKindBadge kind={kind} />
                                        <span
                                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                                            style={{ background: a.archivedAt ? "#64748b" : a.status === "active" ? "#22c55e" : a.status === "paused" ? "#f59e0b" : "#64748b" }}
                                        />
                                    </span>
                                    <span className="block truncate text-[11px] text-slate-400">{a.role}</span>
                                    <span className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                                        {TIER_META[a.modelTier]?.label ?? a.modelTier}
                                        {open > 0 && <span className="rounded bg-white/10 px-1 text-slate-300">{open} open</span>}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                    {!visible.length && <div className="px-3 py-10 text-center text-[12px] text-slate-500">No agents match.</div>}
                </div>
            </aside>

            {/* Editor */}
            <div className="min-w-0 flex-1">
                {creating ? (
                    <AgentEditor initial={creating} onSaved={onSaved} />
                ) : agent ? (
                    <AgentEditor agent={agent} onSaved={onSaved} onOpenTasks={onOpenTasks} />
                ) : (
                    <EmptyState
                        icon={agents.length ? Bot : Users}
                        title={agents.length ? "Select an agent to customize" : "No agents yet"}
                        hint="Change persona, model, desk, modules, permissions, tools, guardrails and budget. Every save is versioned and can be restored."
                        action={
                            <Button variant="primary" icon={Plus} onClick={() => setShowTemplates(true)}>
                                New agent
                            </Button>
                        }
                    />
                )}
            </div>
        </div>
    );
}
