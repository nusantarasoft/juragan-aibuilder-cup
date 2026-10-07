/**
 * Agentic OS — Command Deck graph model + layouts.
 *
 * One model of the whole OS: core (master memory map) → skills/playbooks →
 * memory areas & items (+ goals) → agents → routines/workflows/runs →
 * applications (Nusantarasoft modules). Each layout returns positions in a
 * fixed coordinate space centred on (0,0) with an outer radius of ~500.
 * Layouts are pure and deterministic (seeded by ids) so polling never makes
 * the graph jump.
 */

import { MODULES, type ModuleId } from "@/app/admin/virtual-office/lib/modules";
import type { AppId, AppParams } from "./osUi";
import type { OsAgent, OsGoal, OsMemoryArea, OsMemoryItem, OsPlaybook, OsRoutine, OsRun, OsTask, OsWorkflow, OsWorkflowRun, WfAgentData } from "./types";
import { asGraph } from "./workflowGraph";

export const R = 500;
const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

export type NodeKind = "core" | "area" | "skill" | "playbook" | "memory" | "goal" | "agent" | "routine" | "workflow" | "app" | "run";
export type TypeKey = "skill" | "file" | "goal" | "agent" | "routine" | "workflow" | "app" | "run";

export const TYPE_META: Record<TypeKey, { label: string; color: string; kinds: NodeKind[] }> = {
    skill: { label: "skill", color: "#fb923c", kinds: ["skill", "playbook"] },
    file: { label: "memory", color: "#e879f9", kinds: ["memory"] },
    goal: { label: "goal", color: "#f59e0b", kinds: ["goal"] },
    agent: { label: "agent", color: "#818cf8", kinds: ["agent"] },
    routine: { label: "routine", color: "#fb923c", kinds: ["routine"] },
    workflow: { label: "workflow", color: "#a855f7", kinds: ["workflow"] },
    app: { label: "app", color: "#38bdf8", kinds: ["app"] },
    run: { label: "run", color: "#22c55e", kinds: ["run"] },
};
export const TYPE_KEYS = Object.keys(TYPE_META) as TypeKey[];
export const typeOf = (k: NodeKind): TypeKey | null => TYPE_KEYS.find((t) => TYPE_META[t].kinds.includes(k)) ?? null;

export type RingId = "skills" | "memory" | "agents" | "routines" | "apps";
export const RINGS: { id: RingId; label: string; r: number; types: TypeKey[] }[] = [
    { id: "skills", label: "SKILLS", r: 0.2, types: ["skill"] },
    { id: "memory", label: "MEMORY", r: 0.51, types: ["file", "goal"] },
    { id: "agents", label: "AGENTS", r: 0.6, types: ["agent"] },
    { id: "routines", label: "ROUTINES", r: 0.72, types: ["routine", "workflow", "run"] },
    { id: "apps", label: "APPLICATIONS", r: 0.9, types: ["app"] },
];

export const RUN_COLOR: Record<string, string> = { running: "#38bdf8", success: "#22c55e", failed: "#ef4444", blocked: "#f59e0b", timeout: "#f97316" };
export const UNFILED = "__none";

export interface DeckNode {
    id: string;
    kind: NodeKind;
    label: string;
    sub: string;
    color: string;
    areaId: string | null;
    refId: string;
    slug?: string;
    status?: string;
    ts?: number;
    health?: string;
    progress?: number;
    live?: boolean;
    moduleId?: string;
    route?: string;
    open?: [AppId, AppParams];
}

export type LinkKind = "core" | "member" | "scope" | "skill" | "module" | "playbook" | "routine" | "workflow" | "run" | "goal";
export interface DeckLink {
    s: string;
    t: string;
    kind: LinkKind;
    live?: boolean;
}

export interface DeckArea {
    id: string;
    name: string;
    color: string;
    count: number;
}

export interface DeckModel {
    nodes: DeckNode[];
    links: DeckLink[];
    byId: Map<string, DeckNode>;
    adj: Map<string, Set<string>>;
    areas: DeckArea[];
    counts: { items: number; links: number; runs: number };
    /** Stable structural key — layouts only recompute when this changes. */
    key: string;
}

export interface ModelInput {
    agents: OsAgent[];
    playbooks: OsPlaybook[];
    tasks: OsTask[];
    areas: OsMemoryArea[];
    items: OsMemoryItem[];
    routines: OsRoutine[];
    workflows: OsWorkflow[];
    workflowRuns: OsWorkflowRun[];
    runs: OsRun[];
    goals: OsGoal[];
    now: number;
}

export const LINK_COLOR: Record<LinkKind, string> = {
    core: "#818cf8",
    member: "#e879f9",
    scope: "#e879f9",
    skill: "#fb923c",
    module: "#38bdf8",
    playbook: "#34d399",
    routine: "#fb923c",
    workflow: "#a855f7",
    run: "#22c55e",
    goal: "#f59e0b",
};

export function buildModel(inp: ModelInput): DeckModel {
    const nodes: DeckNode[] = [];
    const links: DeckLink[] = [];
    const seen = new Set<string>();
    const add = (n: DeckNode) => {
        if (seen.has(n.id)) return;
        seen.add(n.id);
        nodes.push(n);
    };
    const link = (s: string, t: string, kind: LinkKind, live = false) => {
        if (s !== t && seen.has(s) && seen.has(t)) links.push({ s, t, kind, live });
    };

    const agents = inp.agents.filter((a) => !a.archivedAt);
    const findAgent = (idOrSlug: string | null | undefined) => (idOrSlug ? agents.find((a) => a.id === idOrSlug || a.slug === idOrSlug) : undefined);
    const areas = inp.areas.filter((a) => !a.archivedAt);
    const items = inp.items.filter((i) => !i.archivedAt);
    const areaIds = new Set(areas.map((a) => a.id));
    const areaOf = (id: string | null | undefined) => (id && areaIds.has(id) ? id : UNFILED);
    const running = inp.tasks.filter((t) => t.status === "running" && !t.archivedAt);
    const openTasks = inp.tasks.filter((t) => ["queued", "running", "awaiting_approval", "review"].includes(t.status) && !t.archivedAt);

    // Core
    add({ id: "core", kind: "core", label: "MEMORY.MAP", sub: `master map · ${areas.length} areas · ${items.length} items`, color: "#818cf8", areaId: null, refId: "core", open: ["memory", {}] });

    // Areas (+ unfiled bucket when needed)
    const deckAreas: DeckArea[] = areas
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
        .map((a) => ({ id: a.id, name: a.name, color: a.color || "#e879f9", count: items.filter((i) => i.areaId === a.id).length }));
    const unfiled = items.filter((i) => areaOf(i.areaId) === UNFILED).length;
    if (unfiled) deckAreas.push({ id: UNFILED, name: "Unfiled", color: "#64748b", count: unfiled });
    for (const a of deckAreas) {
        const owner = findAgent(areas.find((x) => x.id === a.id)?.ownerAgentId);
        add({ id: `ar:${a.id}`, kind: "area", label: a.name, sub: `${a.count} items${owner ? ` · owner ${owner.name}` : ""}`, color: a.color, areaId: a.id, refId: a.id, open: ["memory", a.id === UNFILED ? {} : { areaId: a.id }] });
        link("core", `ar:${a.id}`, "core");
    }

    // Applications (modules) — fixed catalog order
    for (const mo of Object.values(MODULES)) {
        const ag = agents.filter((a) => a.modules.includes(mo.id));
        const open = openTasks.filter((t) => t.moduleId === mo.id).length;
        add({ id: `m:${mo.id}`, kind: "app", label: mo.name, sub: `${ag.length} agents · ${open} open tasks`, color: mo.color, areaId: null, refId: mo.id, moduleId: mo.id, route: mo.route, live: running.some((t) => t.moduleId === mo.id) });
    }

    // Agents
    for (const a of agents) {
        const run = running.find((t) => t.agentId === a.id);
        const owned = areas.find((x) => x.ownerAgentId === a.id || x.ownerAgentId === a.slug);
        add({
            id: `a:${a.id}`,
            kind: "agent",
            label: a.name,
            sub: run ? `working · ${run.title}` : `${a.role} · ${a.status}`,
            color: a.color,
            areaId: owned?.id ?? null,
            refId: a.id,
            slug: a.slug,
            status: a.status,
            live: !!run,
            progress: run?.progress,
            open: ["studio", { agentId: a.id }],
        });
        for (const mid of a.modules) link(`a:${a.id}`, `m:${mid}`, "module", running.some((t) => t.agentId === a.id && t.moduleId === mid));
        for (const slug of a.memoryScope) {
            const ar = areas.find((x) => x.slug === slug || x.id === slug);
            if (ar) link(`a:${a.id}`, `ar:${ar.id}`, "scope");
        }
    }

    // Skills (agent skill tags) + playbooks
    const skillAgents = new Map<string, OsAgent[]>();
    for (const a of agents) for (const s of a.skills) skillAgents.set(s, [...(skillAgents.get(s) ?? []), a]);
    for (const [s, ag] of skillAgents) {
        add({ id: `s:${s}`, kind: "skill", label: s, sub: `skill · ${ag.map((a) => a.name).join(", ")}`, color: "#fb923c", areaId: null, refId: s, open: ["studio", { agentId: ag[0].id }] });
        for (const a of ag) link(`a:${a.id}`, `s:${s}`, "skill");
    }
    for (const p of inp.playbooks.filter((x) => !x.archivedAt)) {
        const mo = MODULES[p.moduleId as ModuleId];
        add({ id: `p:${p.id}`, kind: "playbook", label: p.title, sub: `playbook · ${mo?.name ?? p.moduleId}${p.enabled ? "" : " · disabled"}`, color: mo?.color ?? "#34d399", areaId: null, refId: p.id, moduleId: p.moduleId, route: p.route, status: p.enabled ? "enabled" : "disabled", open: ["playbooks", {}] });
        link(`p:${p.id}`, `m:${p.moduleId}`, "playbook");
        const ag = findAgent(p.agentId);
        if (ag) link(`a:${ag.id}`, `p:${p.id}`, "playbook");
    }

    // Memory items
    for (const i of items) {
        const aid = areaOf(i.areaId);
        const ar = deckAreas.find((x) => x.id === aid);
        add({ id: `i:${i.id}`, kind: "memory", label: i.title, sub: `${i.section} · ${i.kind}${i.path ? ` · ${i.path}` : ""}`, color: ar?.color ?? "#64748b", areaId: aid, refId: i.id, health: i.health, open: ["memory", aid === UNFILED ? {} : { areaId: aid }] });
        link(`i:${i.id}`, `ar:${aid}`, "member");
        for (const ag of i.agentIds) {
            const a = findAgent(ag);
            if (a) link(`a:${a.id}`, `i:${i.id}`, "scope");
        }
    }

    // Goals
    for (const g of inp.goals.filter((x) => !x.archivedAt)) {
        const aid = g.areaId && areaIds.has(g.areaId) ? g.areaId : null;
        add({ id: `g:${g.id}`, kind: "goal", label: g.title, sub: `goal · gate ${g.gateOn} · ${Math.round(g.progress * 100)}%`, color: g.color || "#f59e0b", areaId: aid, refId: g.id, status: g.status, progress: g.progress });
        if (aid) link(`g:${g.id}`, `ar:${aid}`, "goal");
        const owner = findAgent(g.ownerAgentId);
        if (owner) link(`a:${owner.id}`, `g:${g.id}`, "goal");
    }

    // Workflows
    const activeWf = new Set(inp.workflowRuns.filter((r) => r.status === "running" || r.status === "waiting_approval").map((r) => r.workflowId));
    for (const w of inp.workflows.filter((x) => !x.archivedAt)) {
        add({ id: `w:${w.id}`, kind: "workflow", label: w.name, sub: `workflow · ${activeWf.has(w.id) ? "running now" : w.lastStatus ?? "never run"}`, color: "#a855f7", areaId: null, refId: w.id, status: w.lastStatus ?? undefined, live: activeWf.has(w.id), open: ["workflows", { workflowId: w.id }] });
        const ids = new Set<string>();
        for (const n of asGraph(w.graph).nodes) {
            if (n.type !== "agent") continue;
            const a = findAgent((n.data as WfAgentData).agentId);
            if (a && !ids.has(a.id)) {
                ids.add(a.id);
                link(`w:${w.id}`, `a:${a.id}`, "workflow", activeWf.has(w.id));
            }
        }
    }

    // Routines
    const runningRoutines = new Set(inp.runs.filter((r) => r.status === "running" && r.routineId).map((r) => r.routineId as string));
    for (const r of inp.routines.filter((x) => !x.archivedAt)) {
        add({
            id: `r:${r.id}`,
            kind: "routine",
            label: r.name,
            sub: `${r.kind} · ${r.enabled ? r.cron : "disabled"}${r.lastStatus ? ` · last ${r.lastStatus}` : ""}`,
            color: !r.enabled ? "#64748b" : r.lastStatus === "failed" ? "#ef4444" : "#fb923c",
            areaId: null,
            refId: r.id,
            status: r.enabled ? r.lastStatus ?? "enabled" : "disabled",
            live: runningRoutines.has(r.id),
            open: ["pulse", { routineId: r.id }],
        });
        const a = findAgent(r.agentId);
        if (a) link(`r:${r.id}`, `a:${a.id}`, "routine", runningRoutines.has(r.id));
        if (r.workflowId) link(`r:${r.id}`, `w:${r.workflowId}`, "workflow");
        if (r.playbookId) link(`r:${r.id}`, `p:${r.playbookId}`, "playbook");
    }

    // Recent runs (48 h, newest 80)
    const recent = inp.runs
        .filter((r) => inp.now - new Date(r.startedAt).getTime() < 48 * 3600_000)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .slice(0, 80);
    for (const r of recent) {
        add({
            id: `x:${r.id}`,
            kind: "run",
            label: r.routineName ?? r.kind ?? "run",
            sub: `run · ${r.status} · ${r.trigger}${r.costUsd ? ` · $${r.costUsd.toFixed(3)}` : ""}`,
            color: RUN_COLOR[r.status] ?? "#94a3b8",
            areaId: null,
            refId: r.id,
            status: r.status,
            ts: new Date(r.startedAt).getTime(),
            live: r.status === "running",
            open: ["pulse", { tab: "runs" }],
        });
        if (r.routineId && seen.has(`r:${r.routineId}`)) link(`x:${r.id}`, `r:${r.routineId}`, "run", r.status === "running");
        else {
            const a = findAgent(r.agentId);
            if (a) link(`x:${r.id}`, `a:${a.id}`, "run", r.status === "running");
        }
    }

    const byId = new Map(nodes.map((n) => [n.id, n]));
    const adj = new Map<string, Set<string>>();
    for (const l of links) {
        if (!adj.has(l.s)) adj.set(l.s, new Set());
        if (!adj.has(l.t)) adj.set(l.t, new Set());
        adj.get(l.s)!.add(l.t);
        adj.get(l.t)!.add(l.s);
    }
    const key = `${nodes.map((n) => n.id).join("|")}#${links.map((l) => l.s + ">" + l.t).join("|")}`;
    return { nodes, links, byId, adj, areas: deckAreas, counts: { items: nodes.length - 1, links: links.length, runs: inp.runs.length }, key };
}

/* ------------------------------------------------------------------ */
/* Layout helpers                                                      */
/* ------------------------------------------------------------------ */

export interface Pt {
    x: number;
    y: number;
}

export interface LayoutLabel {
    key: string;
    x: number;
    y: number;
    text: string;
    color: string;
    kind: "ring" | "group";
    /** Ring id (kind ring) or area id / type key (kind group) — clicking isolates it. */
    ref: string;
    count?: number;
}

export interface Layout {
    pos: Map<string, Pt>;
    labels: LayoutLabel[];
    guides: { r: number; strong?: boolean; dash?: boolean }[];
    curved?: boolean;
}

/** FNV-1a → [0, 1). */
export function hash01(s: string, salt = 0): number {
    let h = 2166136261 ^ salt;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 100000) / 100000;
}

const polar = (a: number, r: number): Pt => ({ x: Math.cos(a) * r, y: Math.sin(a) * r });

function circMean(angles: number[]): number | null {
    if (!angles.length) return null;
    let sx = 0;
    let sy = 0;
    for (const a of angles) {
        sx += Math.cos(a);
        sy += Math.sin(a);
    }
    if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) return angles[0];
    return Math.atan2(sy, sx);
}

const norm = (a: number) => ((a % TAU) + TAU) % TAU;
const angDiff = (a: number, b: number) => {
    let d = norm(a) - norm(b);
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
};

/** Spread angles so neighbours are at least `minSep` apart (keeps order). */
function spreadAngles(items: { id: string; a: number }[], minSep: number): Map<string, number> {
    const out = new Map<string, number>();
    if (!items.length) return out;
    const s = items.slice().sort((x, y) => norm(x.a) - norm(y.a));
    const sep = Math.min(minSep, TAU / s.length);
    const arr = s.map((x) => norm(x.a));
    for (let iter = 0; iter < 40; iter++) {
        let moved = false;
        for (let i = 0; i < arr.length; i++) {
            const j = (i + 1) % arr.length;
            if (arr.length < 2) break;
            let gap = arr[j] - arr[i];
            if (j === 0) gap += TAU;
            if (gap < sep) {
                const push = (sep - gap) / 2;
                arr[i] -= push;
                arr[j] += push;
                moved = true;
            }
        }
        if (!moved) break;
    }
    s.forEach((x, i) => out.set(x.id, arr[i]));
    return out;
}

/** Fill an annular sector with dots in rows (inner → outer). */
function placeDots(ids: string[], a0: number, a1: number, r0: number, r1: number, sp0: number, pos: Map<string, Pt>) {
    if (!ids.length) return;
    let sp = sp0;
    let rows: { r: number; cap: number }[] = [];
    for (let attempt = 0; attempt < 6; attempt++) {
        rows = [];
        for (let r = r0; r <= r1 + 0.01; r += sp) rows.push({ r, cap: Math.max(1, Math.floor(((a1 - a0) * r) / sp)) });
        if (rows.reduce((s, x) => s + x.cap, 0) >= ids.length) break;
        sp *= 0.82;
    }
    let k = 0;
    for (const row of rows) {
        if (k >= ids.length) break;
        const n = Math.min(row.cap, ids.length - k);
        const step = (a1 - a0) / row.cap;
        const start = a0 + step / 2 + ((row.cap - n) * step) / 2;
        for (let i = 0; i < n; i++) pos.set(ids[k++], polar(start + i * step, row.r));
    }
    // Overflow (very dense areas): stack on the outer row.
    for (; k < ids.length; k++) pos.set(ids[k], polar(a0 + hash01(ids[k]) * (a1 - a0), r1 + 6 * hash01(ids[k], 3)));
}

/* ------------------------------------------------------------------ */
/* RINGS                                                               */
/* ------------------------------------------------------------------ */

export function layoutRings(m: DeckModel): Layout {
    const pos = new Map<string, Pt>();
    pos.set("core", { x: 0, y: 0 });
    const of = (k: NodeKind) => m.nodes.filter((n) => n.kind === k);

    // Applications: evenly spaced, half-step rotated so nothing sits under the ring label.
    const apps = of("app");
    const appAngle = new Map<string, number>();
    apps.forEach((n, i) => {
        const a = -Math.PI / 2 + ((i + 0.5) / apps.length) * TAU;
        appAngle.set(n.refId, a);
        pos.set(n.id, polar(a, 0.9 * R));
    });

    // Agents: near the mean angle of their modules, then evenly slotted.
    const agents = of("agent");
    const pref = agents.map((n) => {
        const mods = [...(m.adj.get(n.id) ?? [])].filter((id) => id.startsWith("m:")).map((id) => appAngle.get(id.slice(2))!).filter((x) => x !== undefined);
        return { n, a: circMean(mods) ?? hash01(n.id) * TAU };
    });
    pref.sort((x, y) => norm(x.a) - norm(y.a));
    const agentAngle = new Map<string, number>();
    if (pref.length) {
        const step = TAU / pref.length;
        const offset = circMean(pref.map((p, i) => p.a - i * step)) ?? 0;
        pref.forEach((p, i) => {
            const a = offset + i * step;
            agentAngle.set(p.n.id, a);
            pos.set(p.n.id, polar(a, 0.6 * R));
        });
    }

    // Memory: one sector per area, dots in rows.
    const gap = m.areas.length > 1 ? 0.05 : 0;
    const weights = m.areas.map((a) => Math.max(a.count, 4));
    const total = weights.reduce((s, w) => s + w, 0) || 1;
    const avail = TAU - gap * m.areas.length;
    let a = -Math.PI / 2 + gap / 2 + 0.02;
    const areaMid = new Map<string, number>();
    m.areas.forEach((ar, i) => {
        const span = (avail * weights[i]) / total;
        const mid = a + span / 2;
        areaMid.set(ar.id, mid);
        pos.set(`ar:${ar.id}`, polar(mid, 0.395 * R));
        const ids = m.nodes.filter((n) => n.kind === "memory" && n.areaId === ar.id).map((n) => n.id);
        placeDots(ids, a, a + span, 0.29 * R, 0.5 * R, 11, pos);
        a += span + gap;
    });

    // Goals: just inside the memory band, at their area.
    const goalsByArea = new Map<string, DeckNode[]>();
    for (const g of of("goal")) goalsByArea.set(g.areaId ?? "", [...(goalsByArea.get(g.areaId ?? "") ?? []), g]);
    for (const [aid, list] of goalsByArea) {
        list.forEach((g, i) => {
            const base = areaMid.get(aid) ?? hash01(g.id) * TAU;
            pos.set(g.id, polar(base + (i - (list.length - 1) / 2) * 0.12, 0.245 * R));
        });
    }

    // Skills cloud: playbooks near their module, skill tags near their agents.
    for (const p of of("playbook")) {
        const base = appAngle.get(p.moduleId ?? "") ?? hash01(p.id) * TAU;
        pos.set(p.id, polar(base + (hash01(p.id, 1) - 0.5) * 0.7, (0.085 + 0.115 * Math.sqrt(hash01(p.id, 2))) * R));
    }
    for (const s of of("skill")) {
        const ag = [...(m.adj.get(s.id) ?? [])].filter((id) => id.startsWith("a:")).map((id) => agentAngle.get(id)!).filter((x) => x !== undefined);
        const base = circMean(ag) ?? hash01(s.id) * TAU;
        pos.set(s.id, polar(base + (hash01(s.id, 1) - 0.5) * 0.9, (0.09 + 0.11 * Math.sqrt(hash01(s.id, 2))) * R));
    }

    // Routines + workflows: near their agent(s), spread apart.
    const pulse = [...of("routine"), ...of("workflow")].map((n) => {
        const ag = [...(m.adj.get(n.id) ?? [])].filter((id) => id.startsWith("a:")).map((id) => agentAngle.get(id)!).filter((x) => x !== undefined);
        return { id: n.id, a: circMean(ag) ?? hash01(n.id) * TAU };
    });
    const spread = spreadAngles(pulse, 0.11);
    for (const [id, ang] of spread) pos.set(id, polar(ang, 0.72 * R));

    // Runs: just outside their routine (or agent), older ones further out.
    const now = Date.now();
    for (const r of of("run")) {
        const target = [...(m.adj.get(r.id) ?? [])][0];
        const tp = target ? pos.get(target) : undefined;
        const base = tp ? Math.atan2(tp.y, tp.x) : hash01(r.id) * TAU;
        const age = Math.min(1, (now - (r.ts ?? now)) / (48 * 3600_000));
        pos.set(r.id, polar(base + (hash01(r.id, 4) - 0.5) * 0.14, (0.775 + 0.06 * age) * R));
    }

    const labels: LayoutLabel[] = RINGS.map((ring) => ({ key: `ring:${ring.id}`, x: 0, y: -(ring.r * R) - 12, text: ring.label, color: "#94a3b8", kind: "ring" as const, ref: ring.id }));
    return {
        pos,
        labels,
        guides: [
            { r: 0.2 * R, dash: true },
            { r: 0.28 * R },
            { r: 0.51 * R },
            { r: 0.6 * R, strong: true },
            { r: 0.72 * R, dash: true },
            { r: 0.9 * R, strong: true },
        ],
    };
}

/* ------------------------------------------------------------------ */
/* CIRCLE (chord-style)                                                */
/* ------------------------------------------------------------------ */

const CIRCLE_ORDER: NodeKind[] = ["app", "agent", "routine", "workflow", "run", "goal", "area", "memory", "playbook", "skill"];

export function layoutCircle(m: DeckModel): Layout {
    const pos = new Map<string, Pt>();
    pos.set("core", { x: 0, y: 0 });
    const list = m.nodes
        .filter((n) => n.kind !== "core")
        .sort((a, b) => CIRCLE_ORDER.indexOf(a.kind) - CIRCLE_ORDER.indexOf(b.kind) || (a.areaId ?? "").localeCompare(b.areaId ?? "") || a.label.localeCompare(b.label));
    const n = Math.max(1, list.length);
    const labels: LayoutLabel[] = [];
    let start = 0;
    list.forEach((node, i) => {
        pos.set(node.id, polar(-Math.PI / 2 + (i / n) * TAU, 0.84 * R));
        const next = list[i + 1];
        if (!next || next.kind !== node.kind) {
            const t = typeOf(node.kind);
            const mid = -Math.PI / 2 + (((start + i) / 2) / n) * TAU;
            const p = polar(mid, 0.97 * R);
            labels.push({ key: `grp:${node.kind}`, x: p.x, y: p.y, text: node.kind === "area" ? "AREAS" : `${(t ? TYPE_META[t].label : node.kind).toUpperCase()}S`, color: t ? TYPE_META[t].color : "#94a3b8", kind: "group", ref: t ?? node.kind, count: i - start + 1 });
            start = i + 1;
        }
    });
    return { pos, labels, guides: [{ r: 0.84 * R, strong: true }], curved: true };
}

/* ------------------------------------------------------------------ */
/* AREAS (clusters)                                                    */
/* ------------------------------------------------------------------ */

export function layoutAreas(m: DeckModel): Layout {
    const pos = new Map<string, Pt>();
    const clusters: { key: string; name: string; color: string; ref: string; center?: string; ids: string[] }[] = [];
    for (const a of m.areas) {
        clusters.push({ key: a.id, name: a.name, color: a.color, ref: a.id, center: `ar:${a.id}`, ids: m.nodes.filter((n) => n.areaId === a.id && n.kind !== "area").map((n) => n.id) });
    }
    const loose = (name: string, color: string, ref: string, kinds: NodeKind[]) =>
        clusters.push({ key: `k:${name}`, name, color, ref, ids: m.nodes.filter((n) => kinds.includes(n.kind) && (!n.areaId || n.kind === "app")).map((n) => n.id) });
    loose("Agents", TYPE_META.agent.color, "agent", ["agent"]);
    loose("Applications", TYPE_META.app.color, "app", ["app"]);
    loose("Pulse", TYPE_META.routine.color, "routine", ["routine", "workflow", "run"]);
    loose("Skills", TYPE_META.skill.color, "skill", ["skill", "playbook"]);
    loose("Goals", TYPE_META.goal.color, "goal", ["goal"]);

    const SP = 15;
    const sized = clusters.filter((c) => c.ids.length || c.center).map((c) => ({ ...c, rad: SP * Math.sqrt(Math.max(1, c.ids.length)) * 0.95 + 26 }));
    sized.sort((a, b) => b.rad - a.rad);

    // Shelf packing into a square-ish area.
    const totalArea = sized.reduce((s, c) => s + (2 * c.rad + 30) ** 2, 0);
    const W = Math.max(600, Math.sqrt(totalArea) * 1.15);
    let x = 0;
    let y = 0;
    let rowH = 0;
    const centers = new Map<string, Pt>();
    for (const c of sized) {
        const d = 2 * c.rad + 30;
        if (x + d > W && x > 0) {
            x = 0;
            y += rowH;
            rowH = 0;
        }
        centers.set(c.key, { x: x + d / 2, y: y + d / 2 });
        x += d;
        rowH = Math.max(rowH, d);
    }
    const H = y + rowH;
    const scale = Math.min(1, 1040 / Math.max(W, H));
    const labels: LayoutLabel[] = [];
    for (const c of sized) {
        const ctr = centers.get(c.key)!;
        const cx0 = (ctr.x - W / 2) * scale;
        const cy0 = (ctr.y - H / 2) * scale;
        if (c.center) pos.set(c.center, { x: cx0, y: cy0 });
        c.ids.forEach((id, i) => {
            const r = SP * Math.sqrt(i + (c.center ? 1.6 : 0.5)) * 0.95 * scale;
            const ang = i * 2.399963;
            pos.set(id, { x: cx0 + Math.cos(ang) * r, y: cy0 + Math.sin(ang) * r });
        });
        labels.push({ key: `grp:${c.key}`, x: cx0, y: cy0 - c.rad * scale - 6, text: c.name.toUpperCase(), color: c.color, kind: "group", ref: c.ref, count: c.ids.length });
    }
    pos.set("core", { x: 0, y: (-H / 2) * scale - 40 });
    return { pos, labels, guides: [] };
}

/* ------------------------------------------------------------------ */
/* LINKS (force-directed, deterministic)                               */
/* ------------------------------------------------------------------ */

export function layoutLinks(m: DeckModel): Layout {
    const seed = layoutRings(m).pos;
    const ids = m.nodes.map((n) => n.id);
    const idx = new Map(ids.map((id, i) => [id, i]));
    const N = ids.length;
    const px = new Float64Array(N);
    const py = new Float64Array(N);
    const vx = new Float64Array(N);
    const vy = new Float64Array(N);
    ids.forEach((id, i) => {
        const p = seed.get(id) ?? { x: 0, y: 0 };
        px[i] = p.x * 0.6 + (hash01(id, 7) - 0.5) * 8;
        py[i] = p.y * 0.6 + (hash01(id, 8) - 0.5) * 8;
    });
    const L = m.links.map((l) => ({ a: idx.get(l.s)!, b: idx.get(l.t)!, len: l.kind === "member" ? 16 : l.kind === "core" ? 120 : l.kind === "run" ? 22 : 55 })).filter((l) => l.a !== undefined && l.b !== undefined);
    const core = idx.get("core") ?? -1;
    const iters = N > 600 ? 140 : 240;
    const rep = 900;
    for (let it = 0; it < iters; it++) {
        const alpha = 1 - it / iters;
        for (let i = 0; i < N; i++) {
            for (let j = i + 1; j < N; j++) {
                let dx = px[i] - px[j];
                let dy = py[i] - py[j];
                let d2 = dx * dx + dy * dy;
                if (d2 > 40000) continue;
                if (d2 < 1) {
                    dx = hash01(ids[i], it) - 0.5;
                    dy = hash01(ids[j], it) - 0.5;
                    d2 = 1;
                }
                const f = (rep / d2) * alpha;
                const d = Math.sqrt(d2);
                vx[i] += (dx / d) * f;
                vy[i] += (dy / d) * f;
                vx[j] -= (dx / d) * f;
                vy[j] -= (dy / d) * f;
            }
        }
        for (const l of L) {
            const dx = px[l.b] - px[l.a];
            const dy = py[l.b] - py[l.a];
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const f = (d - l.len) * 0.035 * alpha;
            vx[l.a] += (dx / d) * f;
            vy[l.a] += (dy / d) * f;
            vx[l.b] -= (dx / d) * f;
            vy[l.b] -= (dy / d) * f;
        }
        for (let i = 0; i < N; i++) {
            vx[i] -= px[i] * 0.004;
            vy[i] -= py[i] * 0.004;
            vx[i] *= 0.6;
            vy[i] *= 0.6;
            const sp = Math.hypot(vx[i], vy[i]);
            if (sp > 30) {
                vx[i] *= 30 / sp;
                vy[i] *= 30 / sp;
            }
            if (i === core) continue;
            px[i] += vx[i];
            py[i] += vy[i];
        }
        if (core >= 0) {
            px[core] = 0;
            py[core] = 0;
        }
    }
    let maxR = 1;
    for (let i = 0; i < N; i++) maxR = Math.max(maxR, Math.hypot(px[i], py[i]));
    const s = Math.min(1.6, 520 / maxR);
    const pos = new Map<string, Pt>();
    ids.forEach((id, i) => pos.set(id, { x: px[i] * s, y: py[i] * s }));
    return { pos, labels: [], guides: [] };
}

export function layoutFor(view: "rings" | "circle" | "areas" | "links", m: DeckModel): Layout {
    if (view === "circle") return layoutCircle(m);
    if (view === "areas") return layoutAreas(m);
    if (view === "links") return layoutLinks(m);
    return layoutRings(m);
}

/* ------------------------------------------------------------------ */
/* Visibility                                                          */
/* ------------------------------------------------------------------ */

/** Nodes visible under the type + area filters (area isolation keeps one hop of context). */
export function visibleIds(m: DeckModel, types: Set<TypeKey>, areas: Set<string> | null): Set<string> {
    const out = new Set<string>();
    const typeOk = (n: DeckNode) => {
        if (n.kind === "core" || n.kind === "area") return true;
        const t = typeOf(n.kind);
        return t ? types.has(t) : true;
    };
    if (!areas || !areas.size) {
        for (const n of m.nodes) if (typeOk(n)) out.add(n.id);
        return out;
    }
    const inArea = new Set<string>();
    for (const n of m.nodes) if (n.areaId && areas.has(n.areaId)) inArea.add(n.id);
    out.add("core");
    for (const id of inArea) {
        const n = m.byId.get(id)!;
        if (typeOk(n)) out.add(id);
        for (const nb of m.adj.get(id) ?? []) {
            const x = m.byId.get(nb);
            if (x && x.kind !== "area" && x.kind !== "memory" && typeOk(x)) out.add(nb);
        }
    }
    return out;
}
