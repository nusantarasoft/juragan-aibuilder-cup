"use client";

/**
 * Agentic OS — Memory Map (MAPS "M").
 * Master map → areas → signpost sections → items: any fact is two hops away.
 * One home per fact; archive instead of delete; the health check is
 * deterministic (no model call) and a human can verify any item.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
    Activity,
    Archive,
    ArchiveRestore,
    Ban,
    BookOpen,
    Brain,
    ChevronRight,
    CircleCheck,
    CircleHelp,
    ExternalLink,
    Eye,
    FileText,
    FolderKanban,
    Globe,
    Layers,
    Lightbulb,
    Link2,
    Map as MapIcon,
    Pin,
    Plus,
    Repeat,
    Save,
    Search,
    ShieldCheck,
    StickyNote,
    Stethoscope,
    TriangleAlert,
    Users,
    Wrench,
    X,
    type LucideIcon,
} from "lucide-react";
import { MODULES } from "@/app/admin/virtual-office/lib/modules";
import { aosApi, phase3Api } from "../lib/api";
import { AGENT_COLORS, slugify } from "../lib/catalog";
import { runP3, startPhase3Polling, usePhase3Store } from "../lib/phase3Store";
import { startPulsePolling, usePulseStore } from "../lib/pulseStore";
import { agentById, useAosStore } from "../lib/store";
import type { MemoryHealth, MemoryKind, MemorySection, OsAgent, OsMemoryArea, OsMemoryItem, OsMemoryItemInput, OsRun } from "../lib/types";
import { AgentDot, Button, Chip, EmptyState, Field, Section, Select, Tabs, TextArea, TextInput, Toggle, cx, timeAgo } from "../ui/kit";

/* ------------------------------------------------------------------ */
/* Meta                                                                */
/* ------------------------------------------------------------------ */

export const SECTION_META: Record<MemorySection, { label: string; icon: LucideIcon; hint: string; color: string }> = {
    projects: { label: "Projects", icon: FolderKanban, hint: "Active work and where it lives", color: "#38bdf8" },
    state: { label: "State", icon: Activity, hint: "Live dashboards and current status", color: "#22c55e" },
    skills: { label: "Skills", icon: Wrench, hint: "How-tos, tools and techniques", color: "#a855f7" },
    memory: { label: "Memory", icon: Brain, hint: "Facts, decisions and knowledge", color: "#e879f9" },
    routines: { label: "Routines", icon: Repeat, hint: "Recurring work and runbooks", color: "#fb923c" },
    not_here: { label: "Not here", icon: Ban, hint: "Deliberately NOT stored here — points elsewhere", color: "#94a3b8" },
};
export const SECTIONS = Object.keys(SECTION_META) as MemorySection[];

export const KIND_META: Record<MemoryKind, { label: string; icon: LucideIcon }> = {
    page: { label: "Admin page", icon: Globe },
    doc: { label: "Document", icon: FileText },
    kb: { label: "KB article", icon: BookOpen },
    note: { label: "Note", icon: StickyNote },
    fact: { label: "Fact", icon: Lightbulb },
    skill: { label: "Skill", icon: Wrench },
    link: { label: "Link", icon: Link2 },
};

export const HEALTH_META: Record<MemoryHealth, { label: string; color: string; icon: LucideIcon }> = {
    ok: { label: "Healthy", color: "#22c55e", icon: CircleCheck },
    stale: { label: "Stale", color: "#f59e0b", icon: TriangleAlert },
    broken: { label: "Broken", color: "#ef4444", icon: X },
    unknown: { label: "Unchecked", color: "#64748b", icon: CircleHelp },
};

const STALE_DAYS = 30;
const MEMORY_MAX_ITEMS = 20;
const MEMORY_MAX_CHARS = 3000;
const KNOWN_ROOTS = new Set(Object.values(MODULES).map((m) => m.route.split("/")[2]).filter(Boolean));

/** Why an item would be flagged by the deterministic check (mirrors the server rules). */
export function healthReason(it: OsMemoryItem, now = Date.now()): string | null {
    if (!it.path?.trim() && !it.content?.trim() && !it.note?.trim()) return "No path, note or content — nothing to find";
    if (it.path?.startsWith("/admin/")) {
        const root = it.path.split("/")[2];
        if (root && !KNOWN_ROOTS.has(root)) return `Links to an unknown module (/admin/${root})`;
    }
    if (!it.lastVerifiedAt) return "Never verified";
    const days = (now - new Date(it.lastVerifiedAt).getTime()) / 86_400_000;
    if (days > STALE_DAYS) return `Not verified for ${Math.floor(days)} days`;
    return null;
}

/** The memory context a prompt routine would see for this agent (mirrors the server). */
export function memoryPreview(agent: OsAgent, areas: OsMemoryArea[], items: OsMemoryItem[]): { text: string; count: number } {
    const scoped = areas.filter((a) => !a.archivedAt && agent.memoryScope.includes(a.slug));
    const slugById = new Map(scoped.map((a) => [a.id, a.slug]));
    const list = items
        .filter((i) => !i.archivedAt && slugById.has(i.areaId))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
        .slice(0, MEMORY_MAX_ITEMS);
    let out = "";
    let count = 0;
    for (const it of list) {
        const line = `- [${slugById.get(it.areaId)}/${it.section}] ${it.title}: ${it.note.replace(/\s+/g, " ").trim()}\n`;
        if (out.length + line.length > MEMORY_MAX_CHARS) break;
        out += line;
        count++;
    }
    return { text: out.trim(), count };
}

export function HealthDot({ health, size = 8 }: { health: MemoryHealth; size?: number }) {
    const h = HEALTH_META[health] ?? HEALTH_META.unknown;
    return <span title={h.label} className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: h.color, boxShadow: `0 0 6px ${h.color}88` }} />;
}

function healthCounts(items: OsMemoryItem[]) {
    const c: Record<MemoryHealth, number> = { ok: 0, stale: 0, broken: 0, unknown: 0 };
    for (const i of items) c[i.health] = (c[i.health] ?? 0) + 1;
    return c;
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

type Tab = "map" | "health" | "access";

export function MemoryMap({ initialTab, initialAreaId }: { initialTab?: string; initialAreaId?: string }) {
    const [tab, setTab] = useState<Tab>((["map", "health", "access"] as Tab[]).includes(initialTab as Tab) ? (initialTab as Tab) : "map");
    const [focus, setFocus] = useState<{ areaId?: string; itemId?: string }>({ areaId: initialAreaId });
    const { items, state, error } = usePhase3Store(useShallow((s) => ({ items: s.items, state: s.state, error: s.error })));

    useEffect(() => startPhase3Polling(15_000), []);

    const live = items.filter((i) => !i.archivedAt);
    const c = healthCounts(live);
    const problems = c.broken + c.stale + c.unknown;

    if (state === "unavailable") {
        return <EmptyState icon={MapIcon} title="Memory Map is unavailable" hint={error ?? "The Agentic OS backend did not answer."} />;
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
                <Tabs<Tab>
                    value={tab}
                    onChange={setTab}
                    tabs={[
                        { id: "map", label: "Map", icon: MapIcon },
                        { id: "health", label: "Health", icon: Stethoscope, badge: problems },
                        { id: "access", label: "Agent access", icon: Users },
                    ]}
                />
                <div className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-400">
                    {(Object.keys(HEALTH_META) as MemoryHealth[]).map((h) => (
                        <span key={h} className="flex items-center gap-1">
                            <HealthDot health={h} /> {c[h]}
                        </span>
                    ))}
                </div>
            </div>
            <div className="min-h-0 flex-1">
                {tab === "map" && <MapTab focus={focus} onFocus={setFocus} />}
                {tab === "health" && (
                    <HealthTab
                        onOpenItem={(it) => {
                            setFocus({ areaId: it.areaId, itemId: it.id });
                            setTab("map");
                        }}
                    />
                )}
                {tab === "access" && <AccessTab />}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Map                                                                 */
/* ------------------------------------------------------------------ */

function MapTab({ focus, onFocus }: { focus: { areaId?: string; itemId?: string }; onFocus: (f: { areaId?: string; itemId?: string }) => void }) {
    const { areas, items, includeArchived, setIncludeArchived } = usePhase3Store(
        useShallow((s) => ({ areas: s.areas, items: s.items, includeArchived: s.includeArchived, setIncludeArchived: s.setIncludeArchived })),
    );
    const agents = useAosStore((s) => s.agents);
    const [q, setQ] = useState("");
    const [editArea, setEditArea] = useState<OsMemoryArea | "new" | null>(null);
    const [newItem, setNewItem] = useState<{ section: MemorySection } | null>(null);

    const sortedAreas = useMemo(() => [...areas].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)), [areas]);
    const area = sortedAreas.find((a) => a.id === focus.areaId) ?? sortedAreas.find((a) => !a.archivedAt);
    const areaItems = useMemo(() => items.filter((i) => i.areaId === area?.id), [items, area?.id]);
    const item = focus.itemId ? items.find((i) => i.id === focus.itemId) : undefined;

    const results = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return [];
        return items
            .filter((i) => [i.title, i.note, i.path ?? "", i.tags.join(" "), i.content].some((t) => t.toLowerCase().includes(s)))
            .slice(0, 60);
    }, [items, q]);

    const owner = area ? agentById(agents, area.ownerAgentId) : undefined;

    return (
        <div className="relative flex h-full min-h-0">
            {/* Master map */}
            <aside className="flex w-[250px] shrink-0 flex-col border-r border-white/10">
                <div className="space-y-2 border-b border-white/10 p-3">
                    <div className="flex items-center gap-2">
                        <label className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 focus-within:border-indigo-400/50">
                            <Search className="h-3.5 w-3.5 text-slate-500" />
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                onKeyDown={(e) => e.stopPropagation()}
                                placeholder="Find anything…"
                                className="w-full bg-transparent text-[12px] text-white placeholder:text-slate-500 focus:outline-none"
                            />
                        </label>
                        <Button variant="primary" icon={Plus} title="New area" onClick={() => setEditArea("new")} />
                    </div>
                    <Toggle checked={includeArchived} onChange={setIncludeArchived} label="Show archived" />
                </div>
                <div className="px-3 pt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Master map</div>
                <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
                    {sortedAreas.map((a) => {
                        const its = items.filter((i) => i.areaId === a.id && !i.archivedAt);
                        const hc = healthCounts(its);
                        return (
                            <button
                                key={a.id}
                                type="button"
                                onClick={() => onFocus({ areaId: a.id })}
                                className={cx(
                                    "w-full rounded-lg border px-2.5 py-2 text-left transition",
                                    area?.id === a.id ? "border-white/20 bg-white/10" : "border-transparent hover:bg-white/5",
                                    a.archivedAt && "opacity-50",
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: a.color }} />
                                    <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-white">{a.name}</span>
                                    <span className="text-[10px] text-slate-500">{its.length}</span>
                                </div>
                                <div className="mt-1 flex items-center gap-1 pl-[18px]">
                                    {hc.broken > 0 && <Chip color={HEALTH_META.broken.color}>{hc.broken} broken</Chip>}
                                    {hc.stale > 0 && <Chip color={HEALTH_META.stale.color}>{hc.stale} stale</Chip>}
                                    {!hc.broken && !hc.stale && its.length > 0 && <span className="text-[10px] text-emerald-400/80">all healthy</span>}
                                    {a.archivedAt && <Chip color="#94a3b8">archived</Chip>}
                                </div>
                            </button>
                        );
                    })}
                    {!sortedAreas.length && <div className="p-3 text-[11px] text-slate-500">No areas yet — create the first one.</div>}
                </div>
            </aside>

            {/* Area / search */}
            <div className="min-w-0 flex-1 overflow-y-auto p-4">
                {q.trim() ? (
                    <div className="space-y-1.5">
                        <div className="mb-2 text-[11px] text-slate-400">
                            {results.length} result{results.length === 1 ? "" : "s"} for “{q}”
                        </div>
                        {results.map((it) => {
                            const a = areas.find((x) => x.id === it.areaId);
                            return (
                                <ItemRow
                                    key={it.id}
                                    item={it}
                                    crumb={`${a?.name ?? "?"} › ${SECTION_META[it.section]?.label ?? it.section}`}
                                    active={item?.id === it.id}
                                    onClick={() => {
                                        onFocus({ areaId: it.areaId, itemId: it.id });
                                        setQ("");
                                    }}
                                />
                            );
                        })}
                    </div>
                ) : area ? (
                    <>
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] text-slate-500">
                                <MapIcon className="h-3.5 w-3.5" /> Master map <ChevronRight className="h-3 w-3" />
                                <span className="font-semibold" style={{ color: area.color }}>
                                    {area.name}
                                </span>
                                {item && (
                                    <>
                                        <ChevronRight className="h-3 w-3" /> {SECTION_META[item.section]?.label}
                                        <ChevronRight className="h-3 w-3" /> <span className="truncate text-slate-300">{item.title}</span>
                                    </>
                                )}
                            </div>
                            <Button size="sm" onClick={() => setEditArea(area)}>
                                Edit area
                            </Button>
                        </div>
                        <div className="mb-4 rounded-xl border p-3" style={{ borderColor: `${area.color}40`, background: `${area.color}0d` }}>
                            <div className="flex items-center gap-2">
                                <Layers className="h-4 w-4" style={{ color: area.color }} />
                                <span className="text-[15px] font-semibold text-white">{area.name}</span>
                                <Chip color={area.color}>{area.slug}</Chip>
                                {owner && (
                                    <span className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-400">
                                        <AgentDot color={owner.color} name={owner.name} size={18} /> owner {owner.name}
                                    </span>
                                )}
                            </div>
                            {area.description && <p className="mt-1 text-[12px] text-slate-400">{area.description}</p>}
                            <div className="mt-2 text-[10px] text-slate-500">
                                Agents with this area in scope:{" "}
                                {agents.filter((a) => !a.archivedAt && a.memoryScope.includes(area.slug)).map((a) => a.name).join(", ") || "none yet (set it in Agent access)"}
                            </div>
                        </div>
                        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                            {SECTIONS.map((sec) => {
                                const S = SECTION_META[sec];
                                const list = areaItems
                                    .filter((i) => i.section === sec && (includeArchived || !i.archivedAt))
                                    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.title.localeCompare(b.title));
                                return (
                                    <Section
                                        key={sec}
                                        title={S.label}
                                        icon={S.icon}
                                        actions={
                                            <button
                                                type="button"
                                                title={`Add to ${S.label}`}
                                                onClick={() => {
                                                    setNewItem({ section: sec });
                                                    onFocus({ areaId: area.id });
                                                }}
                                                className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                            </button>
                                        }
                                    >
                                        <div className="-mt-1 mb-2 text-[10px] text-slate-500">{S.hint}</div>
                                        <div className="space-y-1">
                                            {list.map((it) => (
                                                <ItemRow
                                                    key={it.id}
                                                    item={it}
                                                    active={item?.id === it.id}
                                                    onClick={() => {
                                                        setNewItem(null);
                                                        onFocus({ areaId: area.id, itemId: it.id });
                                                    }}
                                                />
                                            ))}
                                            {!list.length && <div className="rounded-lg border border-dashed border-white/10 px-2 py-2 text-[10px] text-slate-600">Empty signpost</div>}
                                        </div>
                                    </Section>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <EmptyState icon={MapIcon} title="No memory areas" hint="Areas group what agents may know: Service desk, Operations, Engineering…" action={<Button variant="primary" icon={Plus} onClick={() => setEditArea("new")}>New area</Button>} />
                )}
            </div>

            {/* Inspector */}
            {(item || newItem) && area && (
                <aside className="w-[360px] shrink-0 overflow-y-auto border-l border-white/10">
                    <ItemEditor
                        key={item?.id ?? `new-${newItem?.section}`}
                        item={newItem ? undefined : item}
                        areaId={area.id}
                        section={newItem?.section}
                        onClose={() => {
                            setNewItem(null);
                            onFocus({ areaId: area.id });
                        }}
                        onSaved={(it) => {
                            setNewItem(null);
                            onFocus({ areaId: it.areaId, itemId: it.id });
                        }}
                    />
                </aside>
            )}

            {editArea && (
                <AreaDialog
                    area={editArea === "new" ? undefined : editArea}
                    nextSort={(sortedAreas.at(-1)?.sortOrder ?? 0) + 10}
                    onClose={() => setEditArea(null)}
                    onSaved={(a) => {
                        setEditArea(null);
                        onFocus({ areaId: a.id });
                    }}
                />
            )}
        </div>
    );
}

function ItemRow({ item, active, onClick, crumb }: { item: OsMemoryItem; active?: boolean; onClick: () => void; crumb?: string }) {
    const K = KIND_META[item.kind] ?? KIND_META.note;
    return (
        <button
            type="button"
            onClick={onClick}
            className={cx(
                "flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition",
                active ? "border-indigo-400/40 bg-indigo-500/10" : "border-white/5 bg-white/[0.02] hover:bg-white/5",
                item.archivedAt && "opacity-50",
            )}
        >
            <K.icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium text-slate-100">{item.title}</span>
                <span className="block truncate text-[10px] text-slate-500">{crumb ?? item.path ?? item.note ?? K.label}</span>
            </span>
            {item.pinned && <Pin className="h-3 w-3 shrink-0 text-amber-300" />}
            {item.agentIds.length > 0 && <span className="text-[9px] text-slate-500">{item.agentIds.length}🤖</span>}
            <HealthDot health={item.health} />
        </button>
    );
}

/* ------------------------------------------------------------------ */
/* Item editor                                                         */
/* ------------------------------------------------------------------ */

type ItemDraft = Required<Pick<OsMemoryItemInput, "areaId" | "section" | "kind" | "title" | "note" | "content" | "tags" | "pinned" | "agentIds">> & { path: string };

const toItemDraft = (it: OsMemoryItem): ItemDraft => ({
    areaId: it.areaId,
    section: it.section,
    kind: it.kind,
    title: it.title,
    path: it.path ?? "",
    note: it.note,
    content: it.content,
    tags: [...it.tags],
    pinned: it.pinned,
    agentIds: [...it.agentIds],
});

function ItemEditor({ item, areaId, section, onClose, onSaved }: { item?: OsMemoryItem; areaId: string; section?: MemorySection; onClose: () => void; onSaved: (it: OsMemoryItem) => void }) {
    const areas = usePhase3Store((s) => s.areas);
    const agents = useAosStore((s) => s.agents);
    const [d, setD] = useState<ItemDraft>(() =>
        item ? toItemDraft(item) : { areaId, section: section ?? "memory", kind: "note", title: "", path: "", note: "", content: "", tags: [], pinned: false, agentIds: [] },
    );
    const [tagText, setTagText] = useState(d.tags.join(", "));
    const [saving, setSaving] = useState(false);
    const set = <K extends keyof ItemDraft>(k: K, v: ItemDraft[K]) => setD((x) => ({ ...x, [k]: v }));
    const dirty = item ? JSON.stringify(toItemDraft(item)) !== JSON.stringify(d) : true;
    const reason = item ? healthReason(item) : null;

    const save = async () => {
        if (!d.title.trim()) return;
        setSaving(true);
        const input: OsMemoryItemInput = { ...d, title: d.title.trim(), path: d.path.trim() || null, tags: d.tags };
        const out = item ? await runP3("Memory item saved", () => phase3Api.updateItem(item.id, input)) : await runP3("Memory item added", () => phase3Api.createItem(input));
        setSaving(false);
        if (out) onSaved(out);
    };

    const H = item ? HEALTH_META[item.health] ?? HEALTH_META.unknown : null;

    return (
        <div className="space-y-3 p-4">
            <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 truncate text-[14px] font-semibold text-white">{item ? item.title : "New memory item"}</div>
                <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close">
                    <X className="h-4 w-4" />
                </button>
            </div>

            {item && H && (
                <div className="rounded-lg border px-3 py-2 text-[11px]" style={{ borderColor: `${H.color}40`, background: `${H.color}10`, color: H.color }}>
                    <div className="flex items-center gap-1.5 font-semibold">
                        <H.icon className="h-3.5 w-3.5" /> {H.label}
                        <span className="ml-auto font-normal text-slate-400">verified {timeAgo(item.lastVerifiedAt)}</span>
                    </div>
                    {reason && <div className="mt-0.5 text-slate-300">{reason}</div>}
                    {!item.archivedAt && (
                        <Button size="sm" variant="success" icon={ShieldCheck} className="mt-2" onClick={() => void runP3("Verified by you", () => phase3Api.verifyItem(item.id))}>
                            I checked it — mark verified
                        </Button>
                    )}
                </div>
            )}

            <Field label="Title">
                <TextInput value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Ticket queue" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
                <Field label="Area">
                    <Select value={d.areaId} onChange={(v) => set("areaId", v)} options={areas.filter((a) => !a.archivedAt || a.id === d.areaId).map((a) => ({ value: a.id, label: a.name }))} />
                </Field>
                <Field label="Signpost">
                    <Select value={d.section} onChange={(v) => set("section", v as MemorySection)} options={SECTIONS.map((s) => ({ value: s, label: SECTION_META[s].label }))} />
                </Field>
            </div>
            <Field label="Kind">
                <div className="grid grid-cols-4 gap-1">
                    {(Object.keys(KIND_META) as MemoryKind[]).map((k) => {
                        const K = KIND_META[k];
                        return (
                            <button
                                key={k}
                                type="button"
                                onClick={() => set("kind", k)}
                                className={cx("flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 text-[10px] transition", d.kind === k ? "border-indigo-400/50 bg-indigo-500/10 text-white" : "border-white/10 text-slate-400 hover:bg-white/5")}
                            >
                                <K.icon className="h-3.5 w-3.5" />
                                {K.label}
                            </button>
                        );
                    })}
                </div>
            </Field>
            <Field label="Path / URL" hint="Admin route, file path or link">
                <div className="flex gap-1.5">
                    <TextInput value={d.path} onChange={(e) => set("path", e.target.value)} placeholder="/admin/ai-studio/percakapan-wa" />
                    {d.path.trim() && (
                        <Button icon={ExternalLink} title="Open" onClick={() => window.open(d.path.trim(), "_blank", "noopener")} />
                    )}
                </div>
            </Field>
            <Field label="Signpost note" hint="What agents read in their context">
                <TextArea rows={3} value={d.note} onChange={(e) => set("note", e.target.value)} placeholder="One line: what is here and when to use it" />
            </Field>
            <Field label="Content" hint="Optional full text">
                <TextArea rows={4} value={d.content} onChange={(e) => set("content", e.target.value)} />
            </Field>
            <Field label="Tags" hint="comma separated">
                <TextInput
                    value={tagText}
                    onChange={(e) => {
                        setTagText(e.target.value);
                        set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean));
                    }}
                    placeholder="sla, runbook"
                />
            </Field>
            <Toggle checked={d.pinned} onChange={(v) => set("pinned", v)} label="Pinned" hint="Pinned items go first in agent context" />
            <Field label="Explicit agent access" hint="Optional — on top of area scope">
                <div className="flex flex-wrap gap-1">
                    {agents
                        .filter((a) => !a.archivedAt)
                        .map((a) => (
                            <Chip
                                key={a.id}
                                color={a.color}
                                active={d.agentIds.includes(a.id)}
                                onClick={() => set("agentIds", d.agentIds.includes(a.id) ? d.agentIds.filter((x) => x !== a.id) : [...d.agentIds, a.id])}
                            >
                                {a.name}
                            </Chip>
                        ))}
                </div>
            </Field>

            <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
                <Button variant="primary" icon={Save} loading={saving} disabled={!dirty || !d.title.trim()} onClick={save}>
                    {item ? "Save" : "Add"}
                </Button>
                {item && !item.archivedAt && (
                    <Button variant="danger" icon={Archive} onClick={() => void runP3("Memory item archived", () => phase3Api.archiveItem(item.id)).then((o) => o && onClose())}>
                        Archive
                    </Button>
                )}
                {item?.archivedAt && (
                    <Button icon={ArchiveRestore} onClick={() => void runP3("Memory item restored", () => phase3Api.restoreItem(item.id))}>
                        Restore
                    </Button>
                )}
            </div>
            {item && <div className="text-[10px] text-slate-600">Created {timeAgo(item.createdAt)} · updated {timeAgo(item.updatedAt)}</div>}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Area dialog                                                         */
/* ------------------------------------------------------------------ */

function AreaDialog({ area, nextSort, onClose, onSaved }: { area?: OsMemoryArea; nextSort: number; onClose: () => void; onSaved: (a: OsMemoryArea) => void }) {
    const agents = useAosStore((s) => s.agents);
    const [name, setName] = useState(area?.name ?? "");
    const [slug, setSlug] = useState(area?.slug ?? "");
    const [slugTouched, setSlugTouched] = useState(!!area);
    const [description, setDescription] = useState(area?.description ?? "");
    const [color, setColor] = useState(area?.color ?? AGENT_COLORS[Math.floor(Math.random() * AGENT_COLORS.length)]);
    const [owner, setOwner] = useState(area?.ownerAgentId ?? "");
    const [sortOrder, setSortOrder] = useState(area?.sortOrder ?? nextSort);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!name.trim()) return;
        setSaving(true);
        const input = { name: name.trim(), slug: slug || slugify(name), description, color, ownerAgentId: owner || null, sortOrder };
        const out = area ? await runP3("Area saved", () => phase3Api.updateArea(area.id, input)) : await runP3("Area created", () => phase3Api.createArea(input));
        setSaving(false);
        if (out) onSaved(out);
    };

    return (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-md space-y-3 rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4" style={{ color }} />
                    <div className="flex-1 text-[14px] font-semibold text-white">{area ? `Edit “${area.name}”` : "New memory area"}</div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <Field label="Name">
                    <TextInput
                        autoFocus
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            if (!slugTouched) setSlug(slugify(e.target.value));
                        }}
                        placeholder="e.g. Customer success"
                    />
                </Field>
                <Field label="Slug" hint={area ? "Changing it breaks agent scopes that use the old slug" : "Used in agent memory scope"}>
                    <TextInput
                        value={slug}
                        onChange={(e) => {
                            setSlug(slugify(e.target.value));
                            setSlugTouched(true);
                        }}
                    />
                </Field>
                <Field label="Description">
                    <TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                    <Field label="Owner agent">
                        <Select value={owner} onChange={setOwner} options={[{ value: "", label: "— none —" }, ...agents.filter((a) => !a.archivedAt).map((a) => ({ value: a.id, label: a.name }))]} />
                    </Field>
                    <Field label="Sort order">
                        <TextInput type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} />
                    </Field>
                </div>
                <Field label="Colour">
                    <div className="flex flex-wrap gap-1.5">
                        {AGENT_COLORS.map((c) => (
                            <button key={c} type="button" onClick={() => setColor(c)} className={cx("h-5 w-5 rounded-md border-2", color === c ? "border-white" : "border-transparent")} style={{ background: c }} aria-label={c} />
                        ))}
                    </div>
                </Field>
                <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
                    <Button variant="primary" icon={Save} loading={saving} disabled={!name.trim()} onClick={save}>
                        {area ? "Save" : "Create"}
                    </Button>
                    {area && !area.archivedAt && (
                        <Button variant="danger" icon={Archive} onClick={() => void runP3("Area archived", () => phase3Api.archiveArea(area.id)).then((o) => o && onClose())}>
                            Archive
                        </Button>
                    )}
                    {area?.archivedAt && (
                        <Button icon={ArchiveRestore} onClick={() => void runP3("Area restored", () => phase3Api.restoreArea(area.id)).then((o) => o && onClose())}>
                            Restore
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Health                                                              */
/* ------------------------------------------------------------------ */

function HealthTab({ onOpenItem }: { onOpenItem: (it: OsMemoryItem) => void }) {
    const { areas, items } = usePhase3Store(useShallow((s) => ({ areas: s.areas, items: s.items })));
    const runs = usePulseStore((s) => s.runs);
    const [busy, setBusy] = useState(false);
    const [lastRun, setLastRun] = useState<OsRun | null>(null);
    const [filter, setFilter] = useState<MemoryHealth | "problems">("problems");

    useEffect(() => startPulsePolling(20_000), []);

    const live = items.filter((i) => !i.archivedAt);
    const c = healthCounts(live);
    const pct = live.length ? Math.round((c.ok / live.length) * 100) : 100;
    const checkRuns = runs.filter((r) => r.kind === "check").slice(0, 6);
    const list = live
        .filter((i) => (filter === "problems" ? i.health !== "ok" : i.health === filter))
        .sort((a, b) => ["broken", "stale", "unknown", "ok"].indexOf(a.health) - ["broken", "stale", "unknown", "ok"].indexOf(b.health));

    const runCheck = async () => {
        setBusy(true);
        const r = await runP3("Health check finished", () => phase3Api.runMemoryCheck());
        setBusy(false);
        if (r) {
            setLastRun(r);
            void usePulseStore.getState().refresh();
        }
    };

    const verifyAll = async () => {
        for (const it of list) await runP3("", () => phase3Api.verifyItem(it.id), { silent: true });
        useAosStore.getState().toast("success", `Verified ${list.length} item(s)`);
    };

    return (
        <div className="h-full overflow-y-auto p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr]">
                <Section
                    title="Memory health"
                    icon={Stethoscope}
                    actions={
                        <Button variant="primary" icon={Stethoscope} loading={busy} onClick={runCheck} title="Deterministic check — no AI tokens">
                            Run health check
                        </Button>
                    }
                >
                    <div className="flex items-center gap-4">
                        <div className="relative h-20 w-20 shrink-0">
                            <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke={pct > 80 ? "#22c55e" : pct > 50 ? "#f59e0b" : "#ef4444"} strokeWidth="3.5" strokeDasharray={`${pct} 100`} strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[17px] font-bold text-white">{pct}%</span>
                                <span className="text-[9px] text-slate-500">healthy</span>
                            </div>
                        </div>
                        <div className="grid flex-1 grid-cols-2 gap-1.5">
                            {(Object.keys(HEALTH_META) as MemoryHealth[]).map((h) => {
                                const H = HEALTH_META[h];
                                return (
                                    <button
                                        key={h}
                                        type="button"
                                        onClick={() => setFilter(h)}
                                        className={cx("rounded-lg border px-2 py-1.5 text-left", filter === h ? "border-white/25 bg-white/10" : "border-white/10 hover:bg-white/5")}
                                    >
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                            <HealthDot health={h} /> {H.label}
                                        </div>
                                        <div className="text-[16px] font-bold text-white">{c[h]}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="mt-3 text-[10px] leading-relaxed text-slate-500">
                        Rules: nothing to find → <b className="text-red-300">broken</b>; admin link to an unknown module → <b className="text-red-300">broken</b>; not verified for {STALE_DAYS} days →{" "}
                        <b className="text-amber-300">stale</b>. The check also runs nightly as a Pulse routine. Verifying is a human action.
                    </div>
                    {lastRun && (
                        <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-2.5 text-[11px] text-slate-300">
                            <div className="mb-1 flex items-center gap-1.5 font-semibold">
                                <Chip color={lastRun.status === "success" ? "#22c55e" : lastRun.status === "blocked" ? "#f59e0b" : "#ef4444"}>{lastRun.status}</Chip> just now
                            </div>
                            <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-sans">{lastRun.output ?? lastRun.blockedReason ?? lastRun.error}</pre>
                        </div>
                    )}
                </Section>

                <Section title="Recent checks" icon={Repeat}>
                    <div className="space-y-1">
                        {checkRuns.map((r) => (
                            <div key={r.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
                                <div className="flex items-center gap-2 text-[11px]">
                                    <Chip color={r.status === "success" ? "#22c55e" : r.status === "blocked" ? "#f59e0b" : "#ef4444"}>{r.status}</Chip>
                                    <span className="truncate text-slate-200">{r.routineName ?? "Health check"}</span>
                                    <span className="ml-auto shrink-0 text-[10px] text-slate-500">
                                        {r.trigger} · {timeAgo(r.startedAt)}
                                    </span>
                                </div>
                                {r.output && <div className="mt-0.5 line-clamp-2 text-[10px] text-slate-500">{r.output}</div>}
                            </div>
                        ))}
                        {!checkRuns.length && <div className="text-[11px] text-slate-500">No checks yet — run one now.</div>}
                    </div>
                </Section>
            </div>

            <Section
                className="mt-3"
                title={filter === "problems" ? "Needs attention" : HEALTH_META[filter].label}
                icon={TriangleAlert}
                actions={
                    <div className="flex items-center gap-1.5">
                        <Chip color="#94a3b8" active={filter === "problems"} onClick={() => setFilter("problems")}>
                            all problems
                        </Chip>
                        {list.length > 0 && filter !== "ok" && (
                            <Button size="sm" icon={ShieldCheck} onClick={verifyAll} title="Mark every listed item as verified by you">
                                Verify all ({list.length})
                            </Button>
                        )}
                    </div>
                }
            >
                <div className="space-y-1">
                    {list.map((it) => {
                        const a = areas.find((x) => x.id === it.areaId);
                        const reason = healthReason(it);
                        return (
                            <div key={it.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
                                <HealthDot health={it.health} />
                                <button type="button" onClick={() => onOpenItem(it)} className="min-w-0 flex-1 text-left">
                                    <div className="truncate text-[12px] font-medium text-slate-100">{it.title}</div>
                                    <div className="truncate text-[10px] text-slate-500">
                                        {a?.name} › {SECTION_META[it.section]?.label} · {reason ?? "flagged by the last check"}
                                    </div>
                                </button>
                                <span className="shrink-0 text-[10px] text-slate-500">{timeAgo(it.lastVerifiedAt)}</span>
                                <Button size="sm" variant="success" icon={ShieldCheck} onClick={() => void runP3("Verified", () => phase3Api.verifyItem(it.id))}>
                                    Verify
                                </Button>
                            </div>
                        );
                    })}
                    {!list.length && <div className="py-4 text-center text-[11px] text-emerald-300/80">Nothing here — the map is healthy.</div>}
                </div>
            </Section>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Agent access (memory scope matrix)                                  */
/* ------------------------------------------------------------------ */

function AccessTab() {
    const { areas, items } = usePhase3Store(useShallow((s) => ({ areas: s.areas, items: s.items })));
    const agents = useAosStore((s) => s.agents);
    const live = agents.filter((a) => !a.archivedAt);
    const liveAreas = areas.filter((a) => !a.archivedAt).sort((a, b) => a.sortOrder - b.sortOrder);
    const [draft, setDraft] = useState<Record<string, string[]>>({});
    const [preview, setPreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const scopeOf = (a: OsAgent) => draft[a.id] ?? a.memoryScope;
    const dirtyIds = Object.keys(draft).filter((id) => {
        const a = agents.find((x) => x.id === id);
        return a && JSON.stringify([...draft[id]].sort()) !== JSON.stringify([...a.memoryScope].sort());
    });

    const toggle = (a: OsAgent, slug: string) => {
        const cur = scopeOf(a);
        setDraft((d) => ({ ...d, [a.id]: cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug] }));
    };
    const column = (slug: string, on: boolean) =>
        setDraft((d) => {
            const next = { ...d };
            for (const a of live) {
                const cur = next[a.id] ?? a.memoryScope;
                next[a.id] = on ? [...new Set([...cur, slug])] : cur.filter((s) => s !== slug);
            }
            return next;
        });

    const saveAll = async () => {
        setSaving(true);
        for (const id of dirtyIds) await useAosStore.getState().run("", () => aosApi.updateAgent(id, { memoryScope: draft[id] }, "Memory scope updated"), { silent: true });
        setSaving(false);
        setDraft({});
        useAosStore.getState().toast("success", `Memory scope saved for ${dirtyIds.length} agent(s)`);
    };

    const previewAgent = preview ? agents.find((a) => a.id === preview) : undefined;
    const pv = previewAgent ? memoryPreview({ ...previewAgent, memoryScope: scopeOf(previewAgent) }, areas, items) : null;

    return (
        <div className="flex h-full min-h-0">
            <div className="min-w-0 flex-1 overflow-auto p-4">
                <div className="mb-3 flex items-center gap-2">
                    <div className="flex-1 text-[11px] text-slate-400">
                        Which areas each agent may read. Prompt routines get up to {MEMORY_MAX_ITEMS} items (≤ {MEMORY_MAX_CHARS} chars) from these areas — pinned first. No scope = no memory.
                    </div>
                    {dirtyIds.length > 0 && (
                        <>
                            <Button size="sm" variant="ghost" onClick={() => setDraft({})}>
                                Discard
                            </Button>
                            <Button variant="primary" icon={Save} loading={saving} onClick={saveAll}>
                                Save {dirtyIds.length} change{dirtyIds.length === 1 ? "" : "s"}
                            </Button>
                        </>
                    )}
                </div>
                <table className="w-full border-separate border-spacing-0 text-[11px]">
                    <thead>
                        <tr>
                            <th className="sticky left-0 z-10 bg-slate-950 px-2 py-1.5 text-left font-semibold text-slate-400">Agent</th>
                            {liveAreas.map((ar) => {
                                const all = live.every((a) => scopeOf(a).includes(ar.slug));
                                return (
                                    <th key={ar.id} className="px-1 py-1.5 text-center font-semibold" style={{ color: ar.color }}>
                                        <button type="button" onClick={() => column(ar.slug, !all)} title={all ? "Remove for everyone" : "Give everyone access"} className="hover:underline">
                                            {ar.name}
                                        </button>
                                        <div className="text-[9px] font-normal text-slate-500">{items.filter((i) => i.areaId === ar.id && !i.archivedAt).length} items</div>
                                    </th>
                                );
                            })}
                            <th className="px-2 py-1.5 text-right font-semibold text-slate-400">Context</th>
                        </tr>
                    </thead>
                    <tbody>
                        {live.map((a) => {
                            const scope = scopeOf(a);
                            const dirty = dirtyIds.includes(a.id);
                            const p = memoryPreview({ ...a, memoryScope: scope }, areas, items);
                            return (
                                <tr key={a.id} className={cx("hover:bg-white/[0.03]", dirty && "bg-indigo-500/[0.06]")}>
                                    <td className="sticky left-0 z-10 border-t border-white/5 bg-slate-950 px-2 py-1.5">
                                        <div className="flex items-center gap-2">
                                            <AgentDot color={a.color} name={a.name} size={20} />
                                            <span className="font-medium text-slate-100">{a.name}</span>
                                            {dirty && <span className="text-[9px] text-indigo-300">edited</span>}
                                        </div>
                                    </td>
                                    {liveAreas.map((ar) => {
                                        const on = scope.includes(ar.slug);
                                        return (
                                            <td key={ar.id} className="border-t border-white/5 px-1 py-1.5 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => toggle(a, ar.slug)}
                                                    className={cx("mx-auto flex h-6 w-6 items-center justify-center rounded-md border transition", on ? "border-transparent" : "border-white/10 hover:bg-white/10")}
                                                    style={on ? { background: `${ar.color}33`, color: ar.color } : undefined}
                                                    aria-label={`${on ? "Remove" : "Grant"} ${ar.name} for ${a.name}`}
                                                >
                                                    {on && <CircleCheck className="h-3.5 w-3.5" />}
                                                </button>
                                            </td>
                                        );
                                    })}
                                    <td className="border-t border-white/5 px-2 py-1.5 text-right">
                                        <button type="button" onClick={() => setPreview(a.id)} className="inline-flex items-center gap-1 text-slate-400 hover:text-white">
                                            <Eye className="h-3 w-3" /> {p.count} items
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {previewAgent && pv && (
                <aside className="w-[340px] shrink-0 overflow-y-auto border-l border-white/10 p-4">
                    <div className="mb-2 flex items-center gap-2">
                        <AgentDot color={previewAgent.color} name={previewAgent.name} size={22} />
                        <div className="flex-1 text-[13px] font-semibold text-white">What {previewAgent.name} remembers</div>
                        <button type="button" onClick={() => setPreview(null)} className="text-slate-400 hover:text-white" aria-label="Close">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="mb-2 text-[10px] text-slate-500">
                        Exactly the memory block added to {previewAgent.name}&apos;s prompt routines ({pv.count} items, {pv.text.length}/{MEMORY_MAX_CHARS} chars).
                    </div>
                    <pre className="whitespace-pre-wrap rounded-lg border border-white/10 bg-black/40 p-2.5 font-mono text-[10px] leading-relaxed text-slate-300">{pv.text || "(empty — give this agent an area)"}</pre>
                </aside>
            )}
        </div>
    );
}
