"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    Archive,
    ArchiveRestore,
    Bot,
    Brain,
    Copy,
    Download,
    History,
    KeyRound,
    MapPin,
    Pause,
    Play,
    Save,
    ShieldCheck,
    Sparkles,
    Wrench,
} from "lucide-react";
import { MODULES, type ModuleId } from "@/app/admin/virtual-office/lib/modules";
import { DESKS, ZONES, FLOOR } from "@/app/admin/virtual-office/lib/floorplan";
import { aosApi, fetchAgentVersions } from "../lib/api";
import {
    AGENT_COLORS,
    EFFORT_META,
    PERMISSION_LEVELS,
    PROVIDERS,
    RISK_META,
    TIER_META,
    TOOL_CATALOG,
    slugify,
} from "../lib/catalog";
import { useAosStore } from "../lib/store";
import type { Effort, Guardrails, ModelTier, OsAgent, OsAgentInput, OsAgentVersion, Permission, Runner } from "../lib/types";
import { AgentDot, Button, Chip, Field, Section, Select, Tabs, TextArea, TextInput, Toggle, cx, timeAgo } from "../ui/kit";
import { CalendarClock, FlaskConical } from "lucide-react";
import { AgentPlayground, AgentRoutines } from "./AgentPulse";

type Tab = "identity" | "brain" | "workplace" | "access" | "tools" | "guardrails" | "history" | "routines" | "test";

const WORK_ZONES = ZONES.filter((z) => z.id === "engineering" || z.id === "research" || z.id === "operations");
const ALL_MODULES = Object.values(MODULES);

export type AgentDraft = OsAgentInput & { name: string };

export function draftFromAgent(a: OsAgent): AgentDraft {
    return {
        slug: a.slug,
        name: a.name,
        role: a.role,
        description: a.description,
        persona: a.persona,
        systemPrompt: a.systemPrompt,
        provider: a.provider,
        model: a.model,
        modelTier: a.modelTier,
        temperature: a.temperature,
        effort: a.effort,
        color: a.color,
        avatar: a.avatar ?? {},
        zone: a.zone,
        deskId: a.deskId,
        modules: [...a.modules],
        skills: [...a.skills],
        tools: [...a.tools],
        permissions: { ...(a.permissions ?? {}) },
        guardrails: { denySend: true, denyShare: true, denyDelete: true, requireApproval: [], ...(a.guardrails ?? {}) },
        memoryScope: [...a.memoryScope],
        runner: a.runner,
        dailyTokenBudget: a.dailyTokenBudget,
        dailyRunBudget: a.dailyRunBudget,
        status: a.status,
    };
}

/* ------------------------------------------------------------------ */
/* Desk picker: mini floor plan                                        */
/* ------------------------------------------------------------------ */

function DeskPicker({ value, zone, color, agents, selfId, onPick }: { value: string | null | undefined; zone: string | undefined; color: string; agents: OsAgent[]; selfId?: string; onPick: (deskId: string | null, zone: string) => void }) {
    const owners = useMemo(() => new Map(agents.filter((a) => a.id !== selfId && a.deskId && !a.archivedAt).map((a) => [a.deskId!, a])), [agents, selfId]);
    const pad = 1;
    const vb = `${-FLOOR.width / 2 - pad} ${-FLOOR.depth / 2 - pad} ${FLOOR.width + pad * 2} ${FLOOR.depth + pad * 2}`;
    return (
        <div className="space-y-2">
            <svg viewBox={vb} className="w-full rounded-xl border border-white/10 bg-[#070b14]" style={{ aspectRatio: `${FLOOR.width + 2} / ${FLOOR.depth + 2}` }}>
                {ZONES.map((z) => (
                    <g key={z.id}>
                        <rect
                            x={z.center[0] - z.size[0] / 2}
                            y={z.center[1] - z.size[1] / 2}
                            width={z.size[0]}
                            height={z.size[1]}
                            rx={0.4}
                            fill={`${z.color}${zone === z.id ? "26" : "10"}`}
                            stroke={`${z.color}${zone === z.id ? "aa" : "44"}`}
                            strokeWidth={0.08}
                        />
                        <text x={z.center[0] - z.size[0] / 2 + 0.5} y={z.center[1] - z.size[1] / 2 + 1.1} fill={z.color} fontSize={0.8} fontWeight={700} opacity={0.85}>
                            {z.name}
                        </text>
                    </g>
                ))}
                {DESKS.map((d) => {
                    const owner = owners.get(d.id);
                    const mine = value === d.id;
                    const fill = mine ? color : owner ? `${owner.color}` : "#1e293b";
                    return (
                        <g key={d.id} onClick={() => !owner && onPick(d.id, d.zone)} style={{ cursor: owner ? "not-allowed" : "pointer" }}>
                            <title>{owner ? `${d.id} · ${owner.name}` : `${d.id} · free — click to assign`}</title>
                            <rect
                                x={d.position[0] - 0.8}
                                y={d.position[1] - 0.45}
                                width={1.6}
                                height={0.9}
                                rx={0.12}
                                fill={fill}
                                fillOpacity={mine ? 1 : owner ? 0.55 : 1}
                                stroke={mine ? "#fff" : owner ? "transparent" : "#475569"}
                                strokeWidth={mine ? 0.12 : 0.05}
                                strokeDasharray={owner || mine ? undefined : "0.2 0.12"}
                            />
                            {owner && (
                                <text x={d.position[0]} y={d.position[1] + 0.22} textAnchor="middle" fontSize={0.55} fill="#0b1020" fontWeight={800}>
                                    {owner.name.slice(0, 1)}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm" style={{ background: color }} /> This agent</span>
                <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-slate-500/60" /> Taken</span>
                <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm border border-dashed border-slate-500 bg-slate-800" /> Free</span>
                <button type="button" className="ml-auto text-indigo-300 hover:text-indigo-200" onClick={() => onPick(null, zone ?? "research")}>
                    Auto-assign desk
                </button>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

export function AgentEditor({ agent, initial, onSaved, onOpenTasks }: { agent?: OsAgent; initial?: AgentDraft; onSaved: (a: OsAgent) => void; onOpenTasks?: (agentId: string) => void }) {
    const agents = useAosStore((s) => s.agents);
    const run = useAosStore((s) => s.run);
    const [tab, setTab] = useState<Tab>("identity");
    const [draft, setDraft] = useState<AgentDraft>(() => (agent ? draftFromAgent(agent) : initial!));
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [skillText, setSkillText] = useState("");
    const [versions, setVersions] = useState<OsAgentVersion[] | null>(null);

    // Reset when switching agents (but not on every poll refresh of the same agent).
    useEffect(() => {
        setDraft(agent ? draftFromAgent(agent) : initial!);
        setNote("");
        setVersions(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [agent?.id, agent?.version, initial]);

    useEffect(() => {
        if (tab === "history" && agent && !versions) fetchAgentVersions(agent.id).then(setVersions).catch(() => setVersions([]));
    }, [tab, agent, versions]);

    const set = <K extends keyof AgentDraft>(k: K, v: AgentDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
    const dirty = useMemo(() => (agent ? JSON.stringify(draftFromAgent(agent)) !== JSON.stringify(draft) : true), [agent, draft]);
    const guard = (draft.guardrails ?? {}) as Guardrails;
    const perms = (draft.permissions ?? {}) as Record<string, Permission>;
    const modules = (draft.modules ?? []) as string[];
    const providerModels = PROVIDERS.find((p) => p.id === draft.provider)?.models ?? [];

    const toggleModule = (id: string) => {
        const has = modules.includes(id);
        const next = has ? modules.filter((m) => m !== id) : [...modules, id];
        const p = { ...perms };
        if (has) delete p[id];
        else p[id] = p[id] ?? "draft";
        setDraft((d) => ({ ...d, modules: next, permissions: p }));
    };

    const save = async () => {
        if (!draft.name?.trim()) return;
        setSaving(true);
        const input: OsAgentInput = { ...draft, slug: draft.slug || slugify(draft.name) };
        const out = agent
            ? await run(`Saved ${draft.name} (v${agent.version + 1})`, () => aosApi.updateAgent(agent.id, input, note || undefined))
            : await run(`${draft.name} joined the office`, () => aosApi.createAgent(input));
        setSaving(false);
        if (out) {
            setNote("");
            onSaved(out);
        }
    };

    const exportJson = () => {
        const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `agent-${draft.slug || slugify(draft.name)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const tabs: { id: Tab; label: string; icon: typeof Bot }[] = [
        { id: "identity", label: "Identity", icon: Bot },
        { id: "brain", label: "Brain", icon: Brain },
        { id: "workplace", label: "Workplace", icon: MapPin },
        { id: "access", label: "Modules & access", icon: KeyRound },
        { id: "tools", label: "Skills & tools", icon: Wrench },
        { id: "guardrails", label: "Guardrails & budget", icon: ShieldCheck },
        ...(agent ? [{ id: "history" as Tab, label: "History", icon: History }] : []),
        ...(agent ? [{ id: "routines" as Tab, label: "Routines", icon: CalendarClock }] : []),
        ...(agent ? [{ id: "test" as Tab, label: "Playground", icon: FlaskConical }] : []),
    ];

    return (
        <div className="flex h-full min-h-0 flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                <AgentDot color={draft.color ?? "#818cf8"} name={draft.name || "?"} size={38} />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-semibold text-white">{draft.name || "Unnamed agent"}</span>
                        {agent && <Chip color="#94a3b8">v{agent.version}</Chip>}
                        {agent?.archivedAt && <Chip color="#f59e0b">Archived</Chip>}
                        {agent && !agent.archivedAt && (
                            <Chip color={agent.status === "active" ? "#22c55e" : agent.status === "paused" ? "#f59e0b" : "#64748b"}>{agent.status}</Chip>
                        )}
                        {!agent && <Chip color="#818cf8">New</Chip>}
                    </div>
                    <div className="truncate text-[11px] text-slate-400">
                        {draft.role || "—"} · <span className="font-mono">{draft.slug || slugify(draft.name || "")}</span>
                    </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {agent && onOpenTasks && (
                        <Button size="sm" variant="ghost" onClick={() => onOpenTasks(agent.id)}>
                            Tasks
                        </Button>
                    )}
                    {agent && !agent.archivedAt && (
                        <Button
                            size="sm"
                            icon={agent.status === "active" ? Pause : Play}
                            onClick={() => run(agent.status === "active" ? `${agent.name} paused` : `${agent.name} resumed`, () => aosApi.updateAgent(agent.id, { status: agent.status === "active" ? "paused" : "active" }, agent.status === "active" ? "Paused" : "Resumed"))}
                        >
                            {agent.status === "active" ? "Pause" : "Activate"}
                        </Button>
                    )}
                    {agent && (
                        <Button size="sm" icon={Copy} onClick={async () => { const c = await run(`Cloned ${agent.name}`, () => aosApi.cloneAgent(agent.id)); if (c) onSaved(c); }}>
                            Clone
                        </Button>
                    )}
                    <Button size="sm" icon={Download} variant="ghost" onClick={exportJson} title="Export JSON" />
                    {agent &&
                        (agent.archivedAt ? (
                            <Button size="sm" icon={ArchiveRestore} onClick={() => run(`${agent.name} restored`, () => aosApi.restoreAgent(agent.id))}>
                                Restore
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                variant="danger"
                                icon={Archive}
                                onClick={() => {
                                    if (window.confirm(`Archive ${agent.name}? The agent leaves the office but can be restored at any time.`))
                                        void run(`${agent.name} archived`, () => aosApi.archiveAgent(agent.id));
                                }}
                            >
                                Archive
                            </Button>
                        ))}
                </div>
            </div>

            <Tabs tabs={tabs} value={tab} onChange={setTab} className="border-b border-white/10 px-3 py-2" />

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {tab === "identity" && (
                    <div className="grid gap-3 md:grid-cols-2">
                        <Field label="Name">
                            <TextInput value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Sinta" />
                        </Field>
                        <Field label="Role">
                            <TextInput value={draft.role ?? ""} onChange={(e) => set("role", e.target.value)} placeholder="e.g. Marketing Analyst" />
                        </Field>
                        <Field label="Handle" hint="Used in URLs (?agentSession=…)">
                            <TextInput value={draft.slug ?? ""} onChange={(e) => set("slug", slugify(e.target.value))} placeholder={slugify(draft.name || "agent")} />
                        </Field>
                        <Field label="Status">
                            <Select
                                value={draft.status ?? "active"}
                                onChange={(v) => set("status", v as OsAgent["status"])}
                                options={[
                                    { value: "active", label: "Active — picks up work" },
                                    { value: "paused", label: "Paused — keeps its queue" },
                                    { value: "offline", label: "Offline — shut down" },
                                ]}
                            />
                        </Field>
                        <Field label="Description" className="md:col-span-2">
                            <TextArea value={draft.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="What is this agent responsible for?" />
                        </Field>
                        <Field label="Color" className="md:col-span-2">
                            <div className="flex flex-wrap gap-1.5">
                                {AGENT_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => set("color", c)}
                                        className={cx("h-7 w-7 rounded-lg border-2 transition", draft.color === c ? "scale-110 border-white" : "border-transparent hover:scale-105")}
                                        style={{ background: c }}
                                        aria-label={c}
                                    />
                                ))}
                                <input type="color" value={draft.color ?? "#818cf8"} onChange={(e) => set("color", e.target.value)} className="h-7 w-10 cursor-pointer rounded-lg border border-white/10 bg-transparent" />
                            </div>
                        </Field>
                    </div>
                )}

                {tab === "brain" && (
                    <div className="grid gap-3 md:grid-cols-2">
                        <Field label="Provider" hint="Default uses AI Studio → Settings">
                            <Select
                                value={draft.provider ?? "default"}
                                onChange={(v) => setDraft((d) => ({ ...d, provider: v, model: PROVIDERS.find((p) => p.id === v)?.models[0] ?? "default" }))}
                                options={PROVIDERS.map((p) => ({ value: p.id, label: p.name }))}
                            />
                        </Field>
                        <Field label="Model">
                            <TextInput value={draft.model ?? ""} onChange={(e) => set("model", e.target.value)} list="aos-models" />
                            <datalist id="aos-models">
                                {providerModels.map((mm) => (
                                    <option key={mm} value={mm} />
                                ))}
                            </datalist>
                        </Field>
                        <Field label="Tier">
                            <div className="grid grid-cols-3 gap-1.5">
                                {(Object.keys(TIER_META) as ModelTier[]).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => set("modelTier", t)}
                                        className={cx(
                                            "rounded-lg border px-2 py-1.5 text-left transition",
                                            draft.modelTier === t ? "border-indigo-400/60 bg-indigo-500/15" : "border-white/10 hover:bg-white/5",
                                        )}
                                    >
                                        <div className="text-[11px] font-semibold text-white">{TIER_META[t].label}</div>
                                        <div className="text-[10px] text-slate-500">{TIER_META[t].hint}</div>
                                    </button>
                                ))}
                            </div>
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Effort">
                                <Select value={draft.effort ?? "medium"} onChange={(v) => set("effort", v as Effort)} options={(Object.keys(EFFORT_META) as Effort[]).map((e) => ({ value: e, label: EFFORT_META[e] }))} />
                            </Field>
                            <Field label="Temperature" hint={(draft.temperature ?? 0.3).toFixed(2)}>
                                <input type="range" min={0} max={1} step={0.05} value={draft.temperature ?? 0.3} onChange={(e) => set("temperature", Number(e.target.value))} className="mt-2 w-full accent-indigo-500" />
                            </Field>
                        </div>
                        <Field label="Persona" hint="Who the agent is and how it behaves" className="md:col-span-2">
                            <TextArea rows={4} value={draft.persona ?? ""} onChange={(e) => set("persona", e.target.value)} placeholder="You are … You work in … You never …" />
                        </Field>
                        <Field label="System prompt (advanced)" hint="Variables: {{agent.name}} {{module}} {{task.title}} {{memory}}" className="md:col-span-2">
                            <TextArea rows={5} value={draft.systemPrompt ?? ""} onChange={(e) => set("systemPrompt", e.target.value)} className="font-mono text-[11px]" placeholder="Optional. Appended after the persona and the memory map." />
                        </Field>
                        <Field label="Runner" hint="MAPS · Agent layer" className="md:col-span-2">
                            <div className="grid grid-cols-2 gap-1.5">
                                {(
                                    [
                                        { id: "cloud", label: "Cloud worker", hint: "Always on — runs while the office is closed" },
                                        { id: "browser", label: "Browser", hint: "Only while someone has the office open" },
                                    ] as { id: Runner; label: string; hint: string }[]
                                ).map((r) => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onClick={() => set("runner", r.id)}
                                        className={cx("rounded-lg border px-2.5 py-2 text-left transition", draft.runner === r.id ? "border-indigo-400/60 bg-indigo-500/15" : "border-white/10 hover:bg-white/5")}
                                    >
                                        <div className="text-[12px] font-semibold text-white">{r.label}</div>
                                        <div className="text-[10px] text-slate-500">{r.hint}</div>
                                    </button>
                                ))}
                            </div>
                        </Field>
                    </div>
                )}

                {tab === "workplace" && (
                    <div className="space-y-3">
                        <Field label="Zone">
                            <div className="flex flex-wrap gap-1.5">
                                {WORK_ZONES.map((z) => (
                                    <Chip key={z.id} color={z.color} active={draft.zone === z.id} onClick={() => setDraft((d) => ({ ...d, zone: z.id, deskId: d.zone === z.id ? d.deskId : null }))}>
                                        {z.name}
                                    </Chip>
                                ))}
                            </div>
                        </Field>
                        <Field label="Desk" hint={draft.deskId ? `Desk ${draft.deskId}` : "Auto-assigned in the selected zone"}>
                            <DeskPicker value={draft.deskId} zone={draft.zone} color={draft.color ?? "#818cf8"} agents={agents} selfId={agent?.id} onPick={(deskId, zone) => setDraft((d) => ({ ...d, deskId, zone }))} />
                        </Field>
                    </div>
                )}

                {tab === "access" && (
                    <div className="space-y-3">
                        <Section title="Modules this agent works in" icon={KeyRound}>
                            <div className="flex flex-wrap gap-1.5">
                                {ALL_MODULES.map((mo) => (
                                    <Chip key={mo.id} color={mo.color} active={modules.includes(mo.id)} onClick={() => toggleModule(mo.id)}>
                                        {mo.name}
                                    </Chip>
                                ))}
                            </div>
                            <p className="mt-2 text-[10px] text-slate-500">The first module is the agent&apos;s home module (shown on its desk monitor). Autopilot only picks playbooks from these modules.</p>
                        </Section>
                        <Section title="Permission matrix" icon={ShieldCheck}>
                            {modules.length === 0 ? (
                                <div className="text-[12px] text-slate-500">Select at least one module.</div>
                            ) : (
                                <div className="space-y-1.5">
                                    {modules.map((id, i) => {
                                        const mo = MODULES[id as ModuleId];
                                        return (
                                            <div key={id} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5">
                                                <span className="flex w-36 items-center gap-1.5 text-[12px] text-slate-200">
                                                    <span className="h-2 w-2 rounded-sm" style={{ background: mo?.color ?? "#64748b" }} />
                                                    {mo?.name ?? id}
                                                    {i === 0 && <span className="text-[9px] uppercase text-slate-500">home</span>}
                                                </span>
                                                <div className="flex flex-wrap gap-1">
                                                    {PERMISSION_LEVELS.filter((l) => l.id !== "none").map((l) => (
                                                        <Chip key={l.id} color={l.color} active={(perms[id] ?? "draft") === l.id} onClick={() => set("permissions", { ...perms, [id]: l.id })} title={l.hint}>
                                                            {l.label}
                                                        </Chip>
                                                    ))}
                                                </div>
                                                {i > 0 && (
                                                    <button type="button" className="ml-auto text-[10px] text-slate-500 hover:text-white" onClick={() => set("modules", [id, ...modules.filter((x) => x !== id)])}>
                                                        Make home
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Section>
                    </div>
                )}

                {tab === "tools" && (
                    <div className="space-y-3">
                        <Section title="Skills" icon={Sparkles}>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {(draft.skills ?? []).map((s) => (
                                    <Chip key={s} color="#a78bfa" onClick={() => set("skills", (draft.skills ?? []).filter((x) => x !== s))} title="Remove">
                                        {s} ×
                                    </Chip>
                                ))}
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const t = skillText.trim();
                                        if (t && !(draft.skills ?? []).includes(t)) set("skills", [...(draft.skills ?? []), t]);
                                        setSkillText("");
                                    }}
                                >
                                    <TextInput value={skillText} onChange={(e) => setSkillText(e.target.value)} placeholder="Add skill + Enter" className="w-40 py-1" />
                                </form>
                            </div>
                        </Section>
                        <Section title="Tools" icon={Wrench}>
                            <div className="grid gap-1.5 md:grid-cols-2">
                                {TOOL_CATALOG.map((t) => {
                                    const on = (draft.tools ?? []).includes(t.id);
                                    const risky = t.risk === "send" || t.risk === "delete";
                                    const blocked = (t.risk === "send" && guard.denySend) || (t.risk === "delete" && guard.denyDelete);
                                    return (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => set("tools", on ? (draft.tools ?? []).filter((x) => x !== t.id) : [...(draft.tools ?? []), t.id])}
                                            className={cx("flex items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition", on ? "border-indigo-400/40 bg-indigo-500/10" : "border-white/10 hover:bg-white/5")}
                                        >
                                            <span className={cx("mt-0.5 h-3.5 w-3.5 shrink-0 rounded border", on ? "border-indigo-400 bg-indigo-500" : "border-white/25")} />
                                            <span className="min-w-0 flex-1">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="text-[12px] font-medium text-white">{t.name}</span>
                                                    <Chip color={RISK_META[t.risk].color}>{RISK_META[t.risk].label}</Chip>
                                                </span>
                                                <span className="block text-[10px] text-slate-500">{t.description}</span>
                                                {on && risky && blocked && <span className="block text-[10px] text-amber-300">Blocked by guardrails — needs approval</span>}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </Section>
                    </div>
                )}

                {tab === "guardrails" && (
                    <div className="grid gap-3 md:grid-cols-2">
                        <Section title="Hard limits" icon={ShieldCheck}>
                            <Toggle checked={!!guard.denySend} onChange={(v) => set("guardrails", { ...guard, denySend: v })} label="Never send" hint="Emails / messages stay as drafts" />
                            <Toggle checked={!!guard.denyShare} onChange={(v) => set("guardrails", { ...guard, denyShare: v })} label="Never share externally" hint="No public links or exports" />
                            <Toggle checked={!!guard.denyDelete} onChange={(v) => set("guardrails", { ...guard, denyDelete: v })} label="Never delete" hint="Archive instead — keep an undo" />
                        </Section>
                        <Section title="Human approval required for" icon={KeyRound}>
                            <div className="flex flex-wrap gap-1.5">
                                {["deploy", "restart", "payment", "journal-entry", "close-ticket", "customer-contact", "config-change", "purchase"].map((a) => {
                                    const on = (guard.requireApproval ?? []).includes(a);
                                    return (
                                        <Chip key={a} color="#f59e0b" active={on} onClick={() => set("guardrails", { ...guard, requireApproval: on ? (guard.requireApproval ?? []).filter((x) => x !== a) : [...(guard.requireApproval ?? []), a] })}>
                                            {a}
                                        </Chip>
                                    );
                                })}
                            </div>
                            <p className="mt-2 text-[10px] text-slate-500">Tasks touching these actions stop in “Needs approval” until someone approves them.</p>
                        </Section>
                        <Section title="Daily budget" icon={Sparkles} className="md:col-span-2">
                            <div className="grid gap-3 md:grid-cols-2">
                                <Field label="Tokens per day" hint={(draft.dailyTokenBudget ?? 0).toLocaleString()}>
                                    <input type="range" min={10000} max={2000000} step={10000} value={draft.dailyTokenBudget ?? 500000} onChange={(e) => set("dailyTokenBudget", Number(e.target.value))} className="mt-2 w-full accent-indigo-500" />
                                </Field>
                                <Field label="Runs per day" hint={`${draft.dailyRunBudget ?? 20}`}>
                                    <input type="range" min={1} max={200} step={1} value={draft.dailyRunBudget ?? 20} onChange={(e) => set("dailyRunBudget", Number(e.target.value))} className="mt-2 w-full accent-indigo-500" />
                                </Field>
                            </div>
                        </Section>
                    </div>
                )}

                {tab === "history" && agent && (
                    <div className="space-y-1.5">
                        {!versions && <div className="text-[12px] text-slate-500">Loading history…</div>}
                        {versions?.map((v) => (
                            <div key={v.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                                <Chip color={v.version === agent.version ? "#22c55e" : "#94a3b8"}>v{v.version}</Chip>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-[12px] text-slate-200">{v.changeNote || (v.version === 1 ? "Created" : "Updated")}</div>
                                    <div className="text-[10px] text-slate-500">{timeAgo(v.createdAt)}</div>
                                </div>
                                {v.version !== agent.version && (
                                    <Button size="sm" onClick={() => run(`Restored v${v.version} as v${agent.version + 1}`, () => aosApi.restoreAgentVersion(agent.id, v.version))}>
                                        Restore
                                    </Button>
                                )}
                            </div>
                        ))}
                        {versions && !versions.length && <div className="text-[12px] text-slate-500">No history yet.</div>}
                    </div>
                )}

                {tab === "test" && agent && <AgentPlayground agent={agent} />}
                {tab === "routines" && agent && <AgentRoutines agent={agent} />}
            </div>

            {/* Footer */}
            {tab !== "history" && tab !== "test" && tab !== "routines" && (
                <div className="flex items-center gap-2 border-t border-white/10 px-4 py-2.5">
                    {agent && <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Change note (optional)" className="max-w-xs" />}
                    <span className="flex-1 text-[11px] text-slate-500">{dirty ? "Unsaved changes" : "Saved"}</span>
                    {agent && dirty && (
                        <Button variant="ghost" onClick={() => setDraft(draftFromAgent(agent))}>
                            Discard
                        </Button>
                    )}
                    <Button variant="primary" icon={Save} onClick={save} loading={saving} disabled={!dirty || !draft.name?.trim() || modules.length === 0}>
                        {agent ? "Save changes" : "Create agent"}
                    </Button>
                </div>
            )}
        </div>
    );
}
