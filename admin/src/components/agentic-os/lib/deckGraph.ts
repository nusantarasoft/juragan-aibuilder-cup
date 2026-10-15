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
export const RINGS: { id: RingId; label: string; r: number; types: TypeKey[]; color: string }[] = [
    { id: "skills", label: "SKILLS", r: 0.2, types: ["skill"], color: "#fb923c" },
    { id: "memory", label: "MEMORY", r: 0.51, types: ["file", "goal"], color: "#a5b4fc" },
    { id: "agents", label: "AGENTS", r: 0.6, types: ["agent"], color: "#e2e8f0" },
    { id: "routines", label: "ROUTINES", r: 0.72, types: ["routine", "workflow", "run"], color: "#fb923c" },
    { id: "apps", label: "APPLICATIONS", r: 0.9, types: ["app"], color: "#93c5fd" },
];

export const RUN_COLOR: Record<string, string> = { running: "#38bdf8", success: "#22c55e", failed: "#ef4444", blocked: "#f59e0b", timeout: "#f97316" };
export const UNFILED = "__none";
/** Runs older than this are not part of the graph. */
export const RUN_WINDOW_MS = 14 * 86_400_000;

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
        const changed = i.updatedAt ?? i.createdAt;
        add({ id: `i:${i.id}`, kind: "memory", label: i.title, sub: `${i.section} · ${i.kind}${i.path ? ` · ${i.path}` : ""}`, color: ar?.color ?? "#64748b", areaId: aid, refId: i.id, health: i.health, ts: changed ? new Date(changed).getTime() : undefined, open: ["memory", aid === UNFILED ? {} : { areaId: aid }] });
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

    // Recent runs (14 days, newest 120) — the timeline lanes show their history.
    const recent = inp.runs
        .filter((r) => inp.now - new Date(r.startedAt).getTime() < RUN_WINDOW_MS)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .slice(0, 120);
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

export interface Pt3 {
    x: number;
    y: number;
    z: number;
}

export type GraphView = "rings" | "circle" | "areas" | "links" | "timeline" | "orbit";

export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}

/** Decoration of the TIMELINE view (lanes, day grid, files grid, no-date pile). */
export interface TimelineDecor {
    x0: number;
    x1: number;
    laneHead: number;
    lanes: { y: number; label?: string }[];
    laneTop: number;
    laneBottom: number;
    days: { x: number; label: string; major: boolean }[];
    nowX: number;
    filesY: number;
    gridX: number;
    gridTop: number;
    gridBottom: number;
    gridW: number;
    pileX: number;
    pileY: number;
    pileCount: number;
}

export interface Layout {
    pos: Map<string, Pt>;
    labels: LayoutLabel[];
    guides: { r: number; strong?: boolean; dash?: boolean }[];
    curved?: boolean;
    /** Which view produced it (decoration + label placement). */
    kind?: GraphView;
    /** Nodes that fade out in this view (they still move to `pos`). */
    hidden?: Set<string>;
    /** Fixed view box; otherwise derived from `pos`. */
    box?: Box;
    /** 3D positions (orbit). `pos` holds the projection at yaw 0. */
    pos3?: Map<string, Pt3>;
    timeline?: TimelineDecor;
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
        const age = Math.min(1, (now - (r.ts ?? now)) / RUN_WINDOW_MS);
        pos.set(r.id, polar(base + (hash01(r.id, 4) - 0.5) * 0.14, (0.775 + 0.06 * age) * R));
    }

    const labels: LayoutLabel[] = RINGS.map((ring) => ({ key: `ring:${ring.id}`, x: 0, y: -(ring.r * R) - 12, text: ring.label, color: ring.color, kind: "ring" as const, ref: ring.id }));
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
    pos.set("core", { x: 0, y: 0 });
    const of = (k: NodeKind) => m.nodes.filter((n) => n.kind === k);
    const labels: LayoutLabel[] = [];

    // Skills + playbooks: inside the core cloud.
    for (const n of [...of("skill"), ...of("playbook")]) pos.set(n.id, polar(hash01(n.id, 1) * TAU, (0.03 + 0.11 * Math.sqrt(hash01(n.id, 2))) * R));

    // Applications: a tight ring around the core.
    const apps = of("app");
    apps.forEach((n, i) => pos.set(n.id, polar(-Math.PI / 2 + ((i + 0.5) / Math.max(1, apps.length)) * TAU, 0.2 * R)));

    // Area clusters on an outer ring, angular share proportional to cluster size.
    const SP = 13;
    const clusters = m.areas.map((a) => {
        const ids = m.nodes.filter((n) => n.areaId === a.id && (n.kind === "memory" || n.kind === "goal")).map((n) => n.id);
        return { a, ids, rad: SP * Math.sqrt(Math.max(1, ids.length + 1.6)) * 0.95 + 8 };
    });
    const maxRad = clusters.reduce((s, c) => Math.max(s, c.rad), 0);
    const sumDiam = clusters.reduce((s, c) => s + 2 * c.rad + 24, 0);
    const ringR = Math.max(0.42 * R + maxRad, sumDiam / TAU);
    const areaAngle = new Map<string, number>();
    let acc = -Math.PI / 2 - (clusters.length ? ((2 * clusters[0].rad + 24) / sumDiam) * Math.PI : 0);
    for (const c of clusters) {
        const share = ((2 * c.rad + 24) / Math.max(1, sumDiam)) * TAU;
        const mid = acc + share / 2;
        acc += share;
        areaAngle.set(c.a.id, mid);
        const ctr = polar(mid, ringR);
        pos.set(`ar:${c.a.id}`, ctr);
        c.ids.forEach((id, i) => {
            const r = SP * Math.sqrt(i + 1.6) * 0.95;
            const ang = i * 2.399963;
            pos.set(id, { x: ctr.x + Math.cos(ang) * r, y: ctr.y + Math.sin(ang) * r });
        });
    }

    // Agents: inner ring, ordered towards the areas they read.
    const agents = of("agent").map((n) => {
        const near = [...(m.adj.get(n.id) ?? [])]
            .map((id) => (id.startsWith("ar:") ? areaAngle.get(id.slice(3)) : id.startsWith("i:") ? areaAngle.get(m.byId.get(id)?.areaId ?? "") : undefined))
            .filter((x): x is number => x !== undefined);
        return { id: n.id, a: circMean(near) ?? hash01(n.id) * TAU };
    });
    const agentAngle = spreadAngles(agents, TAU / Math.max(agents.length, 1) * 0.9);
    for (const [id, a] of agentAngle) pos.set(id, polar(a, 0.3 * R));

    // Routines + workflows just outside their agents; runs just outside those.
    const pulse = [...of("routine"), ...of("workflow")].map((n) => {
        const ag = [...(m.adj.get(n.id) ?? [])].map((id) => agentAngle.get(id)).filter((x): x is number => x !== undefined);
        return { id: n.id, a: circMean(ag) ?? hash01(n.id) * TAU };
    });
    for (const [id, a] of spreadAngles(pulse, 0.16)) pos.set(id, polar(a, 0.37 * R));
    for (const r of of("run")) {
        const target = [...(m.adj.get(r.id) ?? [])][0];
        const tp = target ? pos.get(target) : undefined;
        const base = tp ? Math.atan2(tp.y, tp.x) : hash01(r.id) * TAU;
        pos.set(r.id, polar(base + (hash01(r.id, 4) - 0.5) * 0.22, (0.41 + 0.03 * hash01(r.id, 5)) * R));
    }

    // Anything left (unplaced goals without an area, …) floats in the routine band.
    for (const n of m.nodes) if (!pos.has(n.id)) pos.set(n.id, polar(hash01(n.id) * TAU, 0.34 * R));

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

/* ------------------------------------------------------------------ */
/* TIMELINE (lanes + files by last change)                             */
/* ------------------------------------------------------------------ */

const TL_X0 = -330;
const TL_X1 = 600;
const LANE_H = 18;
const DOT = 13;

export function layoutTimeline(m: DeckModel, now: number): Layout {
    const pos = new Map<string, Pt>();
    const hidden = new Set<string>();
    const of = (k: NodeKind) => m.nodes.filter((n) => n.kind === k);
    const t1 = now + 12 * 3600_000;
    const t0 = now - RUN_WINDOW_MS;
    const tx = (t: number) => TL_X0 + ((Math.max(t0, Math.min(t1, t)) - t0) / (t1 - t0)) * (TL_X1 - TL_X0);
    const laneHead = TL_X0 - 26;

    // Lanes: routines, then workflows, then agents — each with its runs on the time axis.
    const laneNodes = [...of("routine"), ...of("workflow"), ...of("agent")];
    const laneY = new Map<string, number>();
    laneNodes.forEach((n, i) => {
        const y = i * LANE_H;
        laneY.set(n.id, y);
        pos.set(n.id, { x: laneHead, y });
    });
    const lanes: TimelineDecor["lanes"] = laneNodes.map((n) => ({ y: laneY.get(n.id)! }));
    const orphanRuns = of("run").filter((r) => ![...(m.adj.get(r.id) ?? [])].some((id) => laneY.has(id)));
    if (orphanRuns.length) lanes.push({ y: laneNodes.length * LANE_H, label: "other runs" });
    for (const r of of("run")) {
        const lane = [...(m.adj.get(r.id) ?? [])].find((id) => laneY.has(id));
        const y = lane ? laneY.get(lane)! : laneNodes.length * LANE_H;
        pos.set(r.id, { x: tx(r.ts ?? now), y: y + (hash01(r.id, 9) - 0.5) * 6 });
    }
    const laneBottom = Math.max(0, lanes.length - 1) * LANE_H;

    // Day grid.
    const days: TimelineDecor["days"] = [];
    const d = new Date(t0);
    d.setHours(0, 0, 0, 0);
    for (d.setDate(d.getDate() + 1); d.getTime() <= t1; d.setDate(d.getDate() + 1)) {
        days.push({ x: tx(d.getTime()), label: `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`, major: d.getDay() === 1 });
    }

    // Files by last change: a block of columns, oldest left → newest right.
    const filesY = laneBottom + 30;
    const gridTop = filesY + 20;
    const dated = of("memory")
        .filter((n) => n.ts !== undefined)
        .sort((a, b) => a.ts! - b.ts! || hash01(a.id) - hash01(b.id));
    const rows = Math.max(6, Math.min(20, Math.round(Math.sqrt(dated.length * 0.75))));
    let col = 0;
    let row = 0;
    let cap = rows;
    const areaPts = new Map<string, Pt[]>();
    for (const n of dated) {
        const p = { x: TL_X0 + col * DOT, y: gridTop + row * DOT };
        pos.set(n.id, p);
        areaPts.set(n.areaId ?? "", [...(areaPts.get(n.areaId ?? "") ?? []), p]);
        if (++row >= cap) {
            row = 0;
            col++;
            cap = rows - Math.floor(hash01(`col${col}`) * 4);
        }
    }
    const gridW = (col + (row ? 1 : 0)) * DOT;
    const gridBottom = gridTop + rows * DOT;

    // No-date pile: everything that has no time of its own.
    const pileX = TL_X0 - 210;
    const pile = [...of("app"), ...of("skill"), ...of("playbook"), ...of("goal"), ...of("memory").filter((n) => n.ts === undefined)];
    pile.forEach((n, i) => pos.set(n.id, { x: pileX + (i % 9) * 19 + (Math.floor(i / 9) % 2) * 9, y: gridTop + Math.floor(i / 9) * 17 }));

    // Core + area badges fade out where their content went.
    pos.set("core", { x: pileX + 80, y: gridTop + 40 });
    hidden.add("core");
    for (const a of m.areas) {
        const pts = areaPts.get(a.id) ?? [];
        const c = pts.length ? { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length } : { x: TL_X0, y: gridTop };
        pos.set(`ar:${a.id}`, c);
        hidden.add(`ar:${a.id}`);
    }
    for (const n of m.nodes) if (!pos.has(n.id)) pos.set(n.id, { x: pileX, y: gridTop });

    const top = -40;
    const bottom = Math.max(gridBottom, gridTop + Math.ceil(pile.length / 9) * 17) + 30;
    return {
        kind: "timeline",
        pos,
        labels: [],
        guides: [],
        hidden,
        box: { x: pileX - 40, y: top, w: TL_X1 + 30 - (pileX - 40), h: bottom - top },
        timeline: {
            x0: TL_X0,
            x1: TL_X1,
            laneHead,
            lanes,
            laneTop: 0,
            laneBottom,
            days,
            nowX: tx(now),
            filesY,
            gridX: TL_X0,
            gridTop,
            gridBottom,
            gridW,
            pileX,
            pileY: gridTop,
            pileCount: pile.length,
        },
    };
}

/* ------------------------------------------------------------------ */
/* 3D ORBIT (globe, projected into the same SVG)                       */
/* ------------------------------------------------------------------ */

export const ORBIT = { globe: 270, appRing: 430, pulseY: -350, pulseR: 120, dist: 1500, tilt: 0.32 };

/** Perspective projection: yaw around the vertical axis, then tilt towards the viewer. */
export function project(p: Pt3, yaw: number, tilt = ORBIT.tilt): { x: number; y: number; k: number; z: number } {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const x1 = p.x * c + p.z * s;
    const z1 = -p.x * s + p.z * c;
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const y2 = p.y * ct - z1 * st;
    const z2 = p.y * st + z1 * ct;
    const k = ORBIT.dist / (ORBIT.dist - z2);
    return { x: x1 * k, y: -y2 * k, k, z: z2 };
}

/** n points evenly spread on the unit sphere. */
function fibonacci(n: number): Pt3[] {
    const out: Pt3[] = [];
    const g = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
        const y = 1 - ((i + 0.5) / Math.max(1, n)) * 2;
        const r = Math.sqrt(1 - y * y);
        out.push({ x: Math.cos(i * g) * r, y, z: Math.sin(i * g) * r });
    }
    return out;
}

const scale3 = (p: Pt3, k: number): Pt3 => ({ x: p.x * k, y: p.y * k, z: p.z * k });
const unit3 = (p: Pt3): Pt3 => {
    const l = Math.hypot(p.x, p.y, p.z) || 1;
    return { x: p.x / l, y: p.y / l, z: p.z / l };
};

export function layoutOrbit(m: DeckModel): Layout {
    const G = ORBIT.globe;
    const p3 = new Map<string, Pt3>();
    const of = (k: NodeKind) => m.nodes.filter((n) => n.kind === k);
    p3.set("core", { x: 0, y: 0, z: 0 });

    // Skills + playbooks: inside the nebula.
    for (const n of [...of("skill"), ...of("playbook")]) {
        const d = unit3({ x: hash01(n.id, 1) * 2 - 1, y: hash01(n.id, 2) * 2 - 1, z: hash01(n.id, 3) * 2 - 1 });
        p3.set(n.id, scale3(d, G * (0.08 + 0.22 * Math.cbrt(hash01(n.id, 4)))));
    }

    // Memory + goals: one patch per area on the globe (greedy nearest assignment).
    const surface = m.nodes.filter((n) => n.kind === "memory" || n.kind === "goal");
    const pts = fibonacci(surface.length);
    const free = new Set(pts.map((_, i) => i));
    const areaDirs = fibonacci(Math.max(1, m.areas.length));
    const dot = (a: Pt3, b: Pt3) => a.x * b.x + a.y * b.y + a.z * b.z;
    const groups = m.areas
        .map((a, i) => ({ a, dir: areaDirs[i], ids: surface.filter((n) => n.areaId === a.id).map((n) => n.id) }))
        .sort((x, y) => y.ids.length - x.ids.length);
    for (const grp of groups) {
        const ranked = [...free].sort((i, j) => dot(pts[j], grp.dir) - dot(pts[i], grp.dir));
        const mean = { x: 0, y: 0, z: 0 };
        grp.ids.forEach((id, k) => {
            const idx = ranked[k];
            if (idx === undefined) return;
            free.delete(idx);
            p3.set(id, scale3(pts[idx], G));
            mean.x += pts[idx].x;
            mean.y += pts[idx].y;
            mean.z += pts[idx].z;
        });
        p3.set(`ar:${grp.a.id}`, scale3(grp.ids.length ? unit3(mean) : grp.dir, G + 18));
    }
    const rest = [...free];
    for (const n of surface) if (!p3.has(n.id)) p3.set(n.id, scale3(pts[rest.shift() ?? 0], G));

    // Agents: an inner shell.
    const agents = of("agent");
    fibonacci(agents.length).forEach((d, i) => p3.set(agents[i].id, scale3(d, G * 0.58)));

    // Applications: the equatorial ring.
    const apps = of("app");
    apps.forEach((n, i) => {
        const a = (i / Math.max(1, apps.length)) * TAU;
        p3.set(n.id, { x: Math.cos(a) * ORBIT.appRing, y: 0, z: Math.sin(a) * ORBIT.appRing });
    });

    // Pulse: a ring hanging under the globe; runs just below their routine.
    const pulse = [...of("routine"), ...of("workflow")];
    pulse.forEach((n, i) => {
        const a = (i / Math.max(1, pulse.length)) * TAU + 0.5;
        p3.set(n.id, { x: Math.cos(a) * ORBIT.pulseR, y: ORBIT.pulseY, z: Math.sin(a) * ORBIT.pulseR });
    });
    for (const r of of("run")) {
        const t = [...(m.adj.get(r.id) ?? [])].map((id) => p3.get(id)).find((p) => p && p.y <= ORBIT.pulseY + 1);
        const base = t ?? { x: 0, y: ORBIT.pulseY, z: 0 };
        p3.set(r.id, { x: base.x + (hash01(r.id, 1) - 0.5) * 50, y: base.y - 22 - hash01(r.id, 2) * 30, z: base.z + (hash01(r.id, 3) - 0.5) * 50 });
    }
    for (const n of m.nodes) if (!p3.has(n.id)) p3.set(n.id, { x: (hash01(n.id, 1) - 0.5) * G, y: (hash01(n.id, 2) - 0.5) * G, z: (hash01(n.id, 3) - 0.5) * G });

    const pos = new Map<string, Pt>();
    for (const [id, p] of p3) {
        const q = project(p, 0);
        pos.set(id, { x: q.x, y: q.y });
    }
    const W = ORBIT.appRing * 1.2;
    return { kind: "orbit", pos, pos3: p3, labels: [], guides: [], box: { x: -W, y: -G - 70, w: 2 * W, h: G + 70 + 450 } };
}

export function layoutFor(view: GraphView, m: DeckModel, now = Date.now()): Layout {
    if (view === "timeline") return layoutTimeline(m, now);
    if (view === "orbit") return layoutOrbit(m);
    const l = view === "circle" ? layoutCircle(m) : view === "areas" ? layoutAreas(m) : view === "links" ? layoutLinks(m) : layoutRings(m);
    return { ...l, kind: view };
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
