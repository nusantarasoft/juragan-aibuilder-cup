"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Archive, ArchiveRestore, BookOpen, Copy, Play, Plus, Save, Search } from "lucide-react";
import { MODULES, type ModuleId } from "@/app/admin/virtual-office/lib/modules";
import { aosApi } from "../lib/api";
import { PRIORITY_META } from "../lib/catalog";
import { useAosStore } from "../lib/store";
import type { OsPlaybook, OsPlaybookInput, Priority } from "../lib/types";
import { AgentDot, Button, Chip, EmptyState, Field, Select, TextArea, TextInput, Toggle, cx } from "../ui/kit";
import { StepsEditor } from "../ui/StepsEditor";

const moduleOptions = Object.values(MODULES).map((mo) => ({ value: mo.id, label: mo.name }));

type Draft = Required<Pick<OsPlaybookInput, "moduleId" | "route" | "title" | "description" | "steps" | "priority" | "estimatedMinutes" | "requiresApproval" | "enabled">> & { agentId: string | null };

const toDraft = (p: OsPlaybook): Draft => ({
    agentId: p.agentId,
    moduleId: p.moduleId,
    route: p.route,
    title: p.title,
    description: p.description,
    steps: [...p.steps],
    priority: p.priority,
    estimatedMinutes: p.estimatedMinutes,
    requiresApproval: p.requiresApproval,
    enabled: p.enabled,
});

const blank = (moduleId: ModuleId = "itsm"): Draft => ({
    agentId: null,
    moduleId,
    route: MODULES[moduleId].route,
    title: "",
    description: "",
    steps: [...MODULES[moduleId].steps],
    priority: "normal",
    estimatedMinutes: 10,
    requiresApproval: false,
    enabled: true,
});

export function Playbooks({ initialPlaybookId, initialModuleId }: { initialPlaybookId?: string; initialModuleId?: string } = {}) {
    const { agents, playbooks, includeArchived, setIncludeArchived, run } = useAosStore(
        useShallow((s) => ({ agents: s.agents, playbooks: s.playbooks, includeArchived: s.includeArchived, setIncludeArchived: s.setIncludeArchived, run: s.run })),
    );
    const [moduleFilter, setModuleFilter] = useState<string>(initialModuleId || "all");
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<string | "new" | null>(initialPlaybookId ?? null);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [busy, setBusy] = useState(false);
    const [testAgent, setTestAgent] = useState("");

    useEffect(() => {
        if (!initialPlaybookId) return;
        const found = playbooks.find((p) => p.id === initialPlaybookId);
        if (found) {
            setSelected(found.id);
            setDraft(toDraft(found));
        }
    }, [initialPlaybookId, playbooks]);

    const list = useMemo(() => {
        const q = query.trim().toLowerCase();
        return playbooks
            .filter((p) => (includeArchived ? true : !p.archivedAt))
            .filter((p) => moduleFilter === "all" || p.moduleId === moduleFilter)
            .filter((p) => !q || p.title.toLowerCase().includes(q) || p.steps.some((s) => s.toLowerCase().includes(q)));
    }, [playbooks, moduleFilter, query, includeArchived]);

    const grouped = useMemo(() => {
        const m = new Map<string, OsPlaybook[]>();
        for (const p of list) m.set(p.moduleId, [...(m.get(p.moduleId) ?? []), p]);
        return [...m.entries()].sort((a, b) => (MODULES[a[0] as ModuleId]?.name ?? a[0]).localeCompare(MODULES[b[0] as ModuleId]?.name ?? b[0]));
    }, [list]);

    const current = selected && selected !== "new" ? playbooks.find((p) => p.id === selected) : undefined;
    const capable = draft ? agents.filter((a) => !a.archivedAt && a.modules.includes(draft.moduleId)) : [];

    const select = (p: OsPlaybook) => {
        setSelected(p.id);
        setDraft(toDraft(p));
        setTestAgent("");
    };

    const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

    const save = async () => {
        if (!draft || !draft.title.trim()) return;
        setBusy(true);
        const input: OsPlaybookInput = { ...draft, steps: draft.steps.map((s) => s.trim()).filter(Boolean), title: draft.title.trim() };
        const out = current ? await run("Playbook saved", () => aosApi.updatePlaybook(current.id, input)) : await run("Playbook created", () => aosApi.createPlaybook(input));
        setBusy(false);
        if (out) {
            setSelected(out.id);
            setDraft(toDraft(out));
        }
    };

    const dryRun = async () => {
        if (!draft) return;
        const agentId = testAgent || capable[0]?.id;
        if (!agentId) return;
        await run(`Queued "${draft.title}" for ${agents.find((a) => a.id === agentId)?.name}`, () =>
            aosApi.createTask({
                agentId,
                playbookId: current?.id ?? null,
                title: draft.title,
                description: draft.description,
                moduleId: draft.moduleId,
                route: draft.route,
                steps: draft.steps.filter(Boolean),
                priority: draft.priority,
                requiresApproval: draft.requiresApproval,
                source: "manual",
            }),
        );
    };

    return (
        <div className="flex h-full min-h-0">
            <aside className="flex w-[320px] shrink-0 flex-col border-r border-white/10">
                <div className="space-y-2 border-b border-white/10 p-3">
                    <div className="flex items-center gap-2">
                        <label className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 focus-within:border-indigo-400/50">
                            <Search className="h-3.5 w-3.5 text-slate-500" />
                            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.stopPropagation()} placeholder="Search playbooks…" className="w-full bg-transparent text-[12px] text-white placeholder:text-slate-500 focus:outline-none" />
                        </label>
                        <Button
                            variant="primary"
                            icon={Plus}
                            title="New playbook"
                            onClick={() => {
                                setSelected("new");
                                setDraft(blank(moduleFilter !== "all" ? (moduleFilter as ModuleId) : "itsm"));
                            }}
                        />
                    </div>
                    <Select value={moduleFilter} onChange={setModuleFilter} options={[{ value: "all", label: `All modules (${playbooks.filter((p) => !p.archivedAt).length})` }, ...moduleOptions]} />
                    <Toggle checked={includeArchived} onChange={setIncludeArchived} label="Show archived" />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-2">
                    {grouped.map(([mid, items]) => {
                        const mo = MODULES[mid as ModuleId];
                        return (
                            <div key={mid} className="mb-2">
                                <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: mo?.color ?? "#94a3b8" }}>
                                    <span className="h-1.5 w-1.5 rounded-sm" style={{ background: mo?.color ?? "#94a3b8" }} />
                                    {mo?.name ?? mid}
                                    <span className="text-slate-600">{items.length}</span>
                                </div>
                                {items.map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => select(p)}
                                        className={cx("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition", selected === p.id ? "bg-white/10" : "hover:bg-white/5", (p.archivedAt || !p.enabled) && "opacity-50")}
                                    >
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[12px] text-slate-100">{p.title}</span>
                                            <span className="block text-[10px] text-slate-500">
                                                {p.steps.length} steps · ~{p.estimatedMinutes} min{p.agentId ? ` · ${agents.find((a) => a.id === p.agentId)?.name ?? "agent"} only` : ""}
                                            </span>
                                        </span>
                                        {p.requiresApproval && <Chip color="#f59e0b">approval</Chip>}
                                    </button>
                                ))}
                            </div>
                        );
                    })}
                    {!grouped.length && <div className="px-3 py-10 text-center text-[12px] text-slate-500">No playbooks match.</div>}
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                {!draft ? (
                    <EmptyState icon={BookOpen} title="Playbooks are reusable task scripts" hint="Agents run them step by step in the module page. Autopilot picks playbooks from each agent's modules." />
                ) : (
                    <>
                        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                            <BookOpen className="h-4 w-4" style={{ color: MODULES[draft.moduleId as ModuleId]?.color }} />
                            <span className="flex-1 truncate text-[14px] font-semibold text-white">{draft.title || "New playbook"}</span>
                            {current && (
                                <>
                                    <Button size="sm" icon={Copy} onClick={() => { setSelected("new"); setDraft({ ...draft, title: `${draft.title} (copy)` }); }}>
                                        Duplicate
                                    </Button>
                                    {current.archivedAt ? (
                                        <Button size="sm" icon={ArchiveRestore} onClick={() => run("Playbook restored", () => aosApi.restorePlaybook(current.id))}>
                                            Restore
                                        </Button>
                                    ) : (
                                        <Button size="sm" variant="danger" icon={Archive} onClick={() => run("Playbook archived", () => aosApi.archivePlaybook(current.id))}>
                                            Archive
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                            <div className="grid gap-3 md:grid-cols-2">
                                <Field label="Title" className="md:col-span-2">
                                    <TextInput value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Triage new ITSM tickets" />
                                </Field>
                                <Field label="Module">
                                    <Select
                                        value={draft.moduleId}
                                        onChange={(v) => setDraft((d) => (d ? { ...d, moduleId: v, route: MODULES[v as ModuleId]?.route ?? d.route } : d))}
                                        options={moduleOptions}
                                    />
                                </Field>
                                <Field label="Page">
                                    <TextInput value={draft.route} onChange={(e) => set("route", e.target.value)} className="font-mono" />
                                </Field>
                                <Field label="Priority">
                                    <Select value={draft.priority} onChange={(v) => set("priority", v as Priority)} options={(Object.keys(PRIORITY_META) as Priority[]).map((p) => ({ value: p, label: PRIORITY_META[p].label }))} />
                                </Field>
                                <Field label="Estimated minutes">
                                    <TextInput type="number" min={1} value={draft.estimatedMinutes} onChange={(e) => set("estimatedMinutes", Math.max(1, Number(e.target.value) || 1))} />
                                </Field>
                                <Field label="Restricted to agent" hint="Empty = any agent with this module">
                                    <Select
                                        value={draft.agentId ?? ""}
                                        onChange={(v) => set("agentId", v || null)}
                                        options={[{ value: "", label: "— Shared —" }, ...agents.filter((a) => !a.archivedAt).map((a) => ({ value: a.id, label: a.name }))]}
                                    />
                                </Field>
                                <div className="space-y-1 pt-4">
                                    <Toggle checked={draft.enabled} onChange={(v) => set("enabled", v)} label="Enabled" hint="Available for autopilot & dispatch" />
                                    <Toggle checked={draft.requiresApproval} onChange={(v) => set("requiresApproval", v)} label="Requires approval" hint="Stops before finalising" />
                                </div>
                                <Field label="Description" className="md:col-span-2">
                                    <TextArea value={draft.description} onChange={(e) => set("description", e.target.value)} placeholder="When to use it, inputs, definition of done…" />
                                </Field>
                            </div>
                            <Field label={`Steps (${draft.steps.length})`}>
                                <StepsEditor steps={draft.steps} onChange={(s) => set("steps", s)} color={MODULES[draft.moduleId as ModuleId]?.color} />
                            </Field>
                            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Agents who can run it</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {capable.map((a) => (
                                        <button key={a.id} type="button" onClick={() => setTestAgent(a.id)} className={cx("flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px]", (testAgent || capable[0]?.id) === a.id ? "border-indigo-400/50 bg-indigo-500/15 text-white" : "border-white/10 text-slate-300 hover:bg-white/5")}>
                                            <AgentDot color={a.color} name={a.name} size={16} /> {a.name}
                                        </button>
                                    ))}
                                    {!capable.length && <span className="text-[11px] text-slate-500">No agent has this module yet — add it in Agent Studio.</span>}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-2.5">
                            <Button icon={Play} disabled={!capable.length || !draft.title.trim()} onClick={dryRun} title="Queue this playbook as a task now">
                                Run now
                            </Button>
                            <Button variant="primary" icon={Save} loading={busy} disabled={!draft.title.trim() || !draft.steps.some((s) => s.trim())} onClick={save}>
                                {current ? "Save playbook" : "Create playbook"}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
