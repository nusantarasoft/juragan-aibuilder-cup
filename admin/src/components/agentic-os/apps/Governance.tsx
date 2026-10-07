"use client";

/**
 * Agentic OS — Governance.
 * Approval inbox (tasks + Pulse deliveries), decision history, the agents × modules
 * permission matrix, the append-only audit log with filters/export, and guardrail
 * violations (runs blocked by the deterministic gate + warnings/errors).
 */

import React, { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
    BellRing,
    CircleSlash,
    Download,
    FileText,
    GitBranch,
    Grid3x3,
    History,
    Inbox,
    RefreshCw,
    Search,
    ShieldAlert,
    ShieldCheck,
    ThumbsDown,
    ThumbsUp,
    TriangleAlert,
} from "lucide-react";
import { MODULES, type ModuleId } from "@/app/admin/virtual-office/lib/modules";
import { aosApi, fetchAuditFiltered, type AuditFilter } from "../lib/api";
import { PERMISSION_LEVELS, RISK_META, TOOL_BY_ID } from "../lib/catalog";
import { useOsUi } from "../lib/osUi";
import { usePhase3Store } from "../lib/phase3Store";
import { runPulse, startPulsePolling, usePulseStore } from "../lib/pulseStore";
import { agentById, useAosStore } from "../lib/store";
import type { OsAgent, OsApproval, OsAuditEntry, Permission } from "../lib/types";
import { AgentDot, Button, Chip, EmptyState, Section, Select, Tabs, TextInput, cx, timeAgo } from "../ui/kit";
import { RunDetail, RunTable } from "./Pulse";

const LEVEL_COLOR: Record<string, string> = { info: "#94a3b8", success: "#22c55e", warning: "#f59e0b", error: "#ef4444" };
type GovTab = "inbox" | "history" | "permissions" | "audit" | "violations";

export function GovernanceApp({ initialTab }: { initialTab?: string }) {
    useEffect(() => startPulsePolling(6000), []);
    const approvals = useAosStore((s) => s.approvals);
    const runs = usePulseStore((s) => s.runs);
    const [tab, setTab] = useState<GovTab>((["inbox", "history", "permissions", "audit", "violations"].includes(initialTab ?? "") ? initialTab : "inbox") as GovTab);
    const blocked = runs.filter((r) => r.status === "blocked").length;
    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
                <Tabs<GovTab>
                    value={tab}
                    onChange={setTab}
                    tabs={[
                        { id: "inbox", label: "Approval inbox", icon: Inbox, badge: approvals.length },
                        { id: "history", label: "Decisions", icon: History },
                        { id: "permissions", label: "Permission matrix", icon: Grid3x3 },
                        { id: "audit", label: "Audit log", icon: FileText },
                        { id: "violations", label: "Violations", icon: TriangleAlert, badge: blocked },
                    ]}
                />
            </div>
            <div className="min-h-0 flex-1">
                {tab === "inbox" && <ApprovalInbox />}
                {tab === "history" && <DecisionHistory />}
                {tab === "permissions" && <PermissionMatrix />}
                {tab === "audit" && <AuditExplorer />}
                {tab === "violations" && <Violations />}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Inbox                                                               */
/* ------------------------------------------------------------------ */

function ApprovalCard({ ap, comment, onComment }: { ap: OsApproval; comment: string; onComment: (v: string) => void }) {
    const { agents, tasks } = useAosStore(useShallow((s) => ({ agents: s.agents, tasks: s.tasks })));
    const history = usePulseStore((s) => s.approvalHistory);
    const full = history.find((h) => h.id === ap.id) ?? ap;
    const agent = agentById(agents, ap.agentId);
    const task = tasks.find((t) => t.id === ap.taskId);
    const mo = task ? MODULES[task.moduleId as ModuleId] : undefined;
    const payload = (full.payload ?? {}) as { output?: string; target?: string; workflowId?: string; runId?: string; label?: string; handoff?: string };
    const isGate = ap.action === "workflow_gate";
    const isDelivery = !isGate && (!!full.runId || !!full.routineId || ap.action === "send");
    const launch = useOsUi((s) => s.launch);
    const [busy, setBusy] = useState<"a" | "r" | null>(null);

    const decide = async (approve: boolean) => {
        setBusy(approve ? "a" : "r");
        await runPulse(approve ? "Approved" : "Rejected", () => aosApi.decideApproval(ap.id, approve, comment || undefined));
        if (isGate) void usePhase3Store.getState().refresh();
        setBusy(null);
    };

    return (
        <div className={cx("rounded-xl border p-3", isGate ? "border-purple-400/25 bg-purple-500/[0.06]" : "border-amber-400/20 bg-amber-500/[0.06]")}>
            <div className="flex items-center gap-2">
                {agent ? <AgentDot color={agent.color} name={agent.name} size={22} /> : <ShieldAlert className="h-4 w-4 text-amber-300" />}
                <span className="min-w-0 flex-1 text-[12px] font-semibold text-white">{ap.summary || ap.action}</span>
                <Chip color={isGate ? "#c084fc" : isDelivery ? "#f97316" : "#a855f7"}>
                    {isGate ? <GitBranch className="h-3 w-3" /> : isDelivery ? <BellRing className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                    {isGate ? "workflow gate" : isDelivery ? `${ap.action} · ${payload.target ?? "delivery"}` : ap.action}
                </Chip>
                <span className="text-[10px] text-slate-500">{timeAgo(ap.requestedAt)}</span>
            </div>
            {task && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                    {mo && <Chip color={mo.color}>{mo.name}</Chip>}
                    {task.title}
                </div>
            )}
            {isGate && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span>
                        Approving lets the workflow continue to the next agents; rejecting stops the run.
                    </span>
                    {payload.workflowId && (
                        <button type="button" className="text-purple-300 hover:underline" onClick={() => launch("workflows", { workflowId: payload.workflowId!, ...(payload.runId ? { runId: payload.runId } : {}), tab: "runs" })}>
                            Open the run →
                        </button>
                    )}
                </div>
            )}
            {isGate && payload.handoff && (
                <details className="mt-2 rounded-lg border border-white/10 bg-black/25 p-2" open>
                    <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-slate-500">Hand-off from previous agents</summary>
                    <pre className="mt-1.5 max-h-48 overflow-auto whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-slate-200">{payload.handoff}</pre>
                </details>
            )}
            {payload.output && (
                <details className="mt-2 rounded-lg border border-white/10 bg-black/25 p-2" open>
                    <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-slate-500">Draft to be sent</summary>
                    <pre className="mt-1.5 max-h-48 overflow-auto whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-slate-200">{payload.output}</pre>
                </details>
            )}
            <div className="mt-2 flex items-center gap-1.5">
                <TextInput value={comment} onChange={(e) => onComment(e.target.value)} placeholder="Comment (optional, saved in the audit log)" className="py-1" />
                <Button size="sm" variant="success" icon={ThumbsUp} loading={busy === "a"} onClick={() => void decide(true)}>
                    Approve
                </Button>
                <Button size="sm" variant="danger" icon={ThumbsDown} loading={busy === "r"} onClick={() => void decide(false)}>
                    Reject
                </Button>
            </div>
        </div>
    );
}

function ApprovalInbox() {
    const approvals = useAosStore((s) => s.approvals);
    const [comments, setComments] = useState<Record<string, string>>({});
    const [filter, setFilter] = useState<"all" | "task" | "delivery">("all");
    const list = approvals.filter((a) => filter === "all" || (filter === "task" ? !!a.taskId : !a.taskId));
    return (
        <div className="flex h-full min-h-0 flex-col p-4">
            <div className="mb-2 flex items-center gap-2">
                <Tabs
                    value={filter}
                    onChange={setFilter}
                    tabs={[
                        { id: "all", label: "All", badge: approvals.length },
                        { id: "task", label: "Task completions", badge: approvals.filter((a) => !!a.taskId).length },
                        { id: "delivery", label: "Pulse deliveries", badge: approvals.filter((a) => !a.taskId).length },
                    ]}
                />
                <span className="ml-auto text-[10px] text-slate-500">Agents never send, share, delete or pay without a human here.</span>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {list.map((ap) => (
                    <ApprovalCard key={ap.id} ap={ap} comment={comments[ap.id] ?? ""} onComment={(v) => setComments((c) => ({ ...c, [ap.id]: v }))} />
                ))}
                {!list.length && <EmptyState icon={ShieldCheck} title="Nothing waiting for a human" hint="Approvals appear when an agent wants to finalise, send or share something." />}
            </div>
        </div>
    );
}

function DecisionHistory() {
    const history = usePulseStore((s) => s.approvalHistory);
    const agents = useAosStore((s) => s.agents);
    const decided = history.filter((h) => h.status !== "pending");
    return (
        <div className="h-full overflow-y-auto p-4">
            <Section title={`Decisions · ${decided.length}`} icon={History}>
                <div className="space-y-1">
                    {decided.map((h) => {
                        const agent = agentById(agents, h.agentId);
                        return (
                            <div key={h.id} className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
                                {h.status === "approved" ? <ThumbsUp className="mt-0.5 h-3.5 w-3.5 text-emerald-400" /> : <ThumbsDown className="mt-0.5 h-3.5 w-3.5 text-red-400" />}
                                <div className="min-w-0 flex-1">
                                    <div className="text-[12px] text-slate-200">{h.summary || h.action}</div>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                                        {agent && <span>{agent.name}</span>}
                                        <Chip color={h.status === "approved" ? "#22c55e" : "#ef4444"}>{h.status}</Chip>
                                        {h.comment && <span className="italic text-slate-400">“{h.comment}”</span>}
                                        <span className="ml-auto">{timeAgo(h.decidedAt)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {!decided.length && <div className="py-8 text-center text-[12px] text-slate-500">No decisions yet.</div>}
                </div>
            </Section>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Permission matrix                                                   */
/* ------------------------------------------------------------------ */

const LEVEL_ORDER: Permission[] = PERMISSION_LEVELS.map((p) => p.id);
const LEVEL_META = Object.fromEntries(PERMISSION_LEVELS.map((p) => [p.id, p])) as Record<Permission, (typeof PERMISSION_LEVELS)[number]>;

function PermissionMatrix() {
    const agents = useAosStore((s) => s.agents);
    const active = agents.filter((a) => !a.archivedAt);
    const moduleIds = useMemo(() => {
        const used = new Set(active.flatMap((a) => a.modules));
        return (Object.keys(MODULES) as ModuleId[]).sort((a, b) => Number(used.has(b)) - Number(used.has(a)) || MODULES[a].name.localeCompare(MODULES[b].name));
    }, [active]);
    const [pending, setPending] = useState<string | null>(null);

    const cycle = async (agent: OsAgent, mod: ModuleId) => {
        const perms = { ...(agent.permissions ?? {}) } as Record<string, Permission>;
        const has = agent.modules.includes(mod);
        const cur: Permission = has ? perms[mod] ?? "draft" : "none";
        const next = LEVEL_ORDER[(LEVEL_ORDER.indexOf(cur) + 1) % LEVEL_ORDER.length];
        let modules = agent.modules;
        if (next === "none") {
            modules = modules.filter((m) => m !== mod);
            delete perms[mod];
        } else {
            if (!has) modules = [...modules, mod];
            perms[mod] = next;
        }
        setPending(`${agent.id}:${mod}`);
        await useAosStore
            .getState()
            .run(`${agent.name} · ${MODULES[mod].name}: ${LEVEL_META[next].label}`, () => aosApi.updateAgent(agent.id, { modules, permissions: perms }, `Permission matrix: ${mod} → ${next}`));
        setPending(null);
    };

    return (
        <div className="flex h-full min-h-0 flex-col p-4">
            <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                Click a cell to cycle:
                {PERMISSION_LEVELS.map((p) => (
                    <Chip key={p.id} color={p.color} title={p.hint}>
                        {p.label}
                    </Chip>
                ))}
                <span className="ml-auto">Every change is versioned on the agent and written to the audit log.</span>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-white/10">
                <table className="border-separate border-spacing-0 text-[11px]">
                    <thead className="sticky top-0 z-10 bg-slate-950">
                        <tr>
                            <th className="sticky left-0 z-20 min-w-[170px] border-b border-white/10 bg-slate-950 px-2 py-2 text-left text-[10px] uppercase tracking-wider text-slate-500">Agent</th>
                            {moduleIds.map((m) => (
                                <th key={m} className="border-b border-white/10 px-1 py-2 text-center font-semibold" style={{ color: MODULES[m].color }}>
                                    <div className="mx-auto w-16 truncate" title={MODULES[m].name}>
                                        {MODULES[m].name}
                                    </div>
                                </th>
                            ))}
                            <th className="border-b border-white/10 px-2 py-2 text-left text-[10px] uppercase tracking-wider text-slate-500">Risky tools</th>
                            <th className="border-b border-white/10 px-2 py-2 text-left text-[10px] uppercase tracking-wider text-slate-500">Guardrails</th>
                        </tr>
                    </thead>
                    <tbody>
                        {active.map((a) => {
                            const risky = a.tools.filter((t) => ["send", "delete", "write"].includes(TOOL_BY_ID[t]?.risk ?? ""));
                            const g = a.guardrails ?? {};
                            return (
                                <tr key={a.id} className="hover:bg-white/[0.02]">
                                    <td className="sticky left-0 z-10 border-b border-white/5 bg-slate-950/95 px-2 py-1.5">
                                        <span className="flex items-center gap-1.5">
                                            <AgentDot color={a.color} name={a.name} size={18} />
                                            <span className="truncate font-semibold text-slate-200">{a.name}</span>
                                            {a.status !== "active" && <Chip color="#64748b">{a.status}</Chip>}
                                        </span>
                                    </td>
                                    {moduleIds.map((m) => {
                                        const has = a.modules.includes(m);
                                        const level: Permission = has ? ((a.permissions ?? {})[m] as Permission) ?? "draft" : "none";
                                        const meta = LEVEL_META[level];
                                        const busy = pending === `${a.id}:${m}`;
                                        return (
                                            <td key={m} className="border-b border-white/5 px-1 py-1 text-center">
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() => void cycle(a, m)}
                                                    title={`${a.name} · ${MODULES[m].name}: ${meta.label} — ${meta.hint}`}
                                                    className={cx("w-16 rounded-md py-1 text-[10px] font-semibold transition hover:brightness-125", busy && "animate-pulse")}
                                                    style={level === "none" ? { color: "#475569", border: "1px dashed rgba(255,255,255,0.08)" } : { color: meta.color, background: `${meta.color}1f`, border: `1px solid ${meta.color}40` }}
                                                >
                                                    {level === "none" ? "·" : meta.label}
                                                </button>
                                            </td>
                                        );
                                    })}
                                    <td className="border-b border-white/5 px-2 py-1">
                                        <div className="flex max-w-[220px] flex-wrap gap-1">
                                            {risky.map((t) => (
                                                <Chip key={t} color={RISK_META[TOOL_BY_ID[t].risk].color}>
                                                    {TOOL_BY_ID[t].name}
                                                </Chip>
                                            ))}
                                            {!risky.length && <span className="text-slate-600">—</span>}
                                        </div>
                                    </td>
                                    <td className="border-b border-white/5 px-2 py-1">
                                        <div className="flex flex-wrap gap-1">
                                            {g.denySend && <Chip color="#22c55e">no send</Chip>}
                                            {g.denyShare && <Chip color="#22c55e">no share</Chip>}
                                            {g.denyDelete && <Chip color="#22c55e">no delete</Chip>}
                                            {!!g.requireApproval?.length && <Chip color="#a855f7">approve: {g.requireApproval.join(", ")}</Chip>}
                                            {!g.denySend && !g.denyShare && !g.denyDelete && !g.requireApproval?.length && <Chip color="#f59e0b">none</Chip>}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Audit explorer                                                      */
/* ------------------------------------------------------------------ */

type AuditRowData = OsAuditEntry & { diff?: Record<string, unknown> | null };

function useAuditQuery(filter: AuditFilter, pollMs = 6000) {
    const [rows, setRows] = useState<AuditRowData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const key = JSON.stringify(filter);
    useEffect(() => {
        let alive = true;
        const load = () => {
            setLoading(true);
            fetchAuditFiltered(filter)
                .then((r) => {
                    if (!alive) return;
                    setRows(r);
                    setError(null);
                })
                .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)))
                .finally(() => alive && setLoading(false));
        };
        const t0 = setTimeout(load, 250);
        const t = pollMs ? setInterval(load, pollMs) : null;
        return () => {
            alive = false;
            clearTimeout(t0);
            if (t) clearInterval(t);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, pollMs]);
    return { rows, loading, error };
}

function exportCsv(rows: AuditRowData[]) {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["createdAt", "level", "actorType", "actorId", "action", "entity", "entityId", "moduleId", "summary"];
    const body = rows.map((r) => [r.createdAt, r.level, r.actorType, r.actorId, r.action, r.entity, r.entityId, r.moduleId, r.summary].map(esc).join(","));
    const blob = new Blob([[head.join(","), ...body].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agentic-os-audit-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function AuditLine({ e }: { e: AuditRowData }) {
    const agents = useAosStore((s) => s.agents);
    const [open, setOpen] = useState(false);
    const agent = e.actorType === "agent" ? agentById(agents, e.actorId) : undefined;
    const mo = e.moduleId ? MODULES[e.moduleId as ModuleId] : undefined;
    const hasDiff = !!e.diff && Object.keys(e.diff).length > 0;
    return (
        <div className="rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
            <div className="flex items-start gap-2">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: LEVEL_COLOR[e.level] }} />
                <div className="min-w-0 flex-1">
                    <div className="text-[12px] leading-snug text-slate-200">{e.summary || `${e.action} ${e.entity}`}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                        {agent ? (
                            <span className="flex items-center gap-1">
                                <AgentDot color={agent.color} name={agent.name} size={14} /> {agent.name}
                            </span>
                        ) : (
                            <span>{e.actorType === "user" ? "User" : e.actorType === "agent" ? e.actorId : "System"}</span>
                        )}
                        <Chip color="#64748b">
                            {e.action} · {e.entity}
                        </Chip>
                        {mo && <Chip color={mo.color}>{mo.name}</Chip>}
                        {hasDiff && (
                            <button type="button" onClick={() => setOpen(!open)} className="text-indigo-300 hover:underline">
                                {open ? "hide details" : "details"}
                            </button>
                        )}
                        <span className="ml-auto" title={e.createdAt}>
                            {new Date(e.createdAt).toLocaleString()}
                        </span>
                    </div>
                    {open && hasDiff && <pre className="mt-1.5 max-h-56 overflow-auto rounded-md bg-black/30 p-2 font-mono text-[10px] text-slate-400">{JSON.stringify(e.diff, null, 2)}</pre>}
                </div>
            </div>
        </div>
    );
}

function AuditExplorer() {
    const agents = useAosStore((s) => s.agents);
    const [level, setLevel] = useState("");
    const [entity, setEntity] = useState("");
    const [actor, setActor] = useState("");
    const [search, setSearch] = useState("");
    const [since, setSince] = useState("");
    const [until, setUntil] = useState("");
    const [limit, setLimit] = useState(200);
    const filter: AuditFilter = {
        level: level || undefined,
        entity: entity || undefined,
        actorId: actor || undefined,
        search: search.trim() || undefined,
        since: since ? new Date(since).toISOString() : undefined,
        until: until ? new Date(until).toISOString() : undefined,
        limit,
    };
    const { rows, loading, error } = useAuditQuery(filter);
    const counts = rows.reduce<Record<string, number>>((a, r) => ((a[r.level] = (a[r.level] ?? 0) + 1), a), {});

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 px-4 py-2">
                <div className="relative w-56">
                    <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                    <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search summaries…" className="py-1 pl-7" />
                </div>
                <Select value={level} onChange={setLevel} className="w-28 py-1" options={[{ value: "", label: "All levels" }, ...["info", "success", "warning", "error"].map((v) => ({ value: v, label: v }))]} />
                <Select
                    value={entity}
                    onChange={setEntity}
                    className="w-32 py-1"
                    options={[{ value: "", label: "All entities" }, ...["agent", "task", "playbook", "routine", "approval", "memory_item", "memory_area", "workflow", "settings"].map((v) => ({ value: v, label: v }))]}
                />
                <Select value={actor} onChange={setActor} className="w-32 py-1" options={[{ value: "", label: "All actors" }, ...agents.map((a) => ({ value: a.slug, label: a.name }))]} />
                <input type="datetime-local" value={since} onChange={(e) => setSince(e.target.value)} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-slate-200 [color-scheme:dark]" title="From" />
                <input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-slate-200 [color-scheme:dark]" title="Until" />
                <Select value={String(limit)} onChange={(v) => setLimit(Number(v))} className="w-24 py-1" options={[100, 200, 500, 1000].map((n) => ({ value: String(n), label: `${n} rows` }))} />
                <div className="ml-auto flex items-center gap-1.5">
                    {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-500" />}
                    {Object.entries(counts).map(([k, v]) => (
                        <Chip key={k} color={LEVEL_COLOR[k]}>
                            {v} {k}
                        </Chip>
                    ))}
                    <Button size="sm" icon={Download} disabled={!rows.length} onClick={() => exportCsv(rows)}>
                        CSV
                    </Button>
                </div>
            </div>
            {error && <div className="mx-4 mt-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-200">{error}</div>}
            <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-3">
                {rows.map((e) => (
                    <AuditLine key={e.id} e={e} />
                ))}
                {!rows.length && !loading && <div className="py-10 text-center text-[12px] text-slate-500">No entries match.</div>}
            </div>
            <p className="border-t border-white/10 px-4 py-1.5 text-[10px] text-slate-600">Append-only: entries cannot be edited or deleted (enforced by a database trigger).</p>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Violations                                                          */
/* ------------------------------------------------------------------ */

function Violations() {
    const runs = usePulseStore((s) => s.runs);
    const blocked = runs.filter((r) => r.status === "blocked");
    const failed = runs.filter((r) => r.status === "failed" || r.status === "timeout");
    const [selected, setSelected] = useState<string | null>(null);
    const sel = runs.find((r) => r.id === selected) ?? null;
    const warnings = useAuditQuery({ level: "warning", limit: 60 }, 10000);
    const errors = useAuditQuery({ level: "error", limit: 60 }, 10000);

    const reasons = blocked.reduce<Record<string, number>>((acc, r) => {
        const key = (r.blockedReason ?? "unknown").replace(/\d+(\.\d+)?/g, "N");
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
    }, {});

    return (
        <div className={cx("grid h-full min-h-0", sel ? "grid-cols-[1fr_380px]" : "grid-cols-1")}>
            <div className="min-h-0 space-y-3 overflow-y-auto p-4">
                <div className="grid gap-2 md:grid-cols-3">
                    <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.06] p-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
                            <CircleSlash className="h-3.5 w-3.5" /> Blocked by gate
                        </div>
                        <div className="text-2xl font-bold text-white">{blocked.length}</div>
                    </div>
                    <div className="rounded-xl border border-red-400/20 bg-red-500/[0.06] p-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-red-200">
                            <TriangleAlert className="h-3.5 w-3.5" /> Failed / timeout
                        </div>
                        <div className="text-2xl font-bold text-white">{failed.length}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Top reasons</div>
                        <div className="mt-1 space-y-0.5">
                            {Object.entries(reasons)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 3)
                                .map(([k, v]) => (
                                    <div key={k} className="flex items-center gap-2 text-[11px]">
                                        <span className="min-w-0 flex-1 truncate text-slate-300">{k}</span>
                                        <span className="tabular-nums text-amber-300">{v}</span>
                                    </div>
                                ))}
                            {!blocked.length && <div className="text-[11px] text-slate-500">No blocks — caps and permissions are holding.</div>}
                        </div>
                    </div>
                </div>
                <Section title="Blocked & failed runs" icon={CircleSlash}>
                    {blocked.length + failed.length ? (
                        <RunTable runs={[...blocked, ...failed].sort((a, b) => b.startedAt.localeCompare(a.startedAt))} onSelect={(r) => setSelected(r.id)} selectedId={selected} />
                    ) : (
                        <div className="py-6 text-center text-[12px] text-slate-500">Nothing blocked or failed.</div>
                    )}
                </Section>
                <div className="grid gap-3 lg:grid-cols-2">
                    <Section title="Warnings" icon={ShieldAlert}>
                        <div className="max-h-72 space-y-0.5 overflow-y-auto">
                            {warnings.rows.map((e) => (
                                <AuditLine key={e.id} e={e} />
                            ))}
                            {!warnings.rows.length && <div className="py-6 text-center text-[12px] text-slate-500">No warnings.</div>}
                        </div>
                    </Section>
                    <Section title="Errors" icon={TriangleAlert}>
                        <div className="max-h-72 space-y-0.5 overflow-y-auto">
                            {errors.rows.map((e) => (
                                <AuditLine key={e.id} e={e} />
                            ))}
                            {!errors.rows.length && <div className="py-6 text-center text-[12px] text-slate-500">No errors.</div>}
                        </div>
                    </Section>
                </div>
            </div>
            {sel && (
                <aside className="min-h-0 overflow-y-auto border-l border-white/10 p-3">
                    <RunDetail run={sel} onClose={() => setSelected(null)} />
                </aside>
            )}
        </div>
    );
}
