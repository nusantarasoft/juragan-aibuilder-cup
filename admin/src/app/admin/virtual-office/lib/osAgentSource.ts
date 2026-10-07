import { aosApi, fetchAuditFiltered } from "@/components/agentic-os/lib/api";
import { TIER_META } from "@/components/agentic-os/lib/catalog";
import { startAosPolling, useAosStore } from "@/components/agentic-os/lib/store";
import type { OsAgent, OsAuditEntry, OsTask } from "@/components/agentic-os/lib/types";
import { DESKS, DESK_BY_ID, LOUNGE_SPOTS, MEETING_SEATS, STATUS_META } from "./floorplan";
import { MEETING_TOPICS } from "./mockData";
import { MODULES, inferModule, stepIndex, type ModuleId } from "./modules";
import type { ActivityEntry, Agent, AgentCommand, AgentDataSource, AgentLocation, AgentStatus, ChatMessage, OfficeEvent, ZoneId } from "./types";

/**
 * Live data source: agents, tasks and activity come from the Agentic OS
 * (Postgres via the middleware GraphQL API). The server-side runner moves
 * tasks forward; the office only adds cosmetic movement (lounge, War Room).
 */

const POLL_MS = 3000;
/** How long a workflow's agents brief in the War Room before returning to their desks. */
const HUDDLE_MS = 20_000;
const WORK_ZONES: ZoneId[] = ["engineering", "research", "operations"];
const uid = () => Math.random().toString(36).slice(2, 10);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const isModule = (m: string): m is ModuleId => m in MODULES;

/** Give every agent a unique desk: saved desk first, then a free one in its zone, then anywhere. */
function resolveDesks(agents: OsAgent[]): Map<string, string> {
    const out = new Map<string, string>();
    const taken = new Set<string>();
    const ordered = [...agents].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const a of ordered) {
        if (a.deskId && DESK_BY_ID[a.deskId] && !taken.has(a.deskId)) {
            out.set(a.id, a.deskId);
            taken.add(a.deskId);
        }
    }
    for (const a of ordered) {
        if (out.has(a.id)) continue;
        const free = DESKS.find((d) => d.zone === a.zone && !taken.has(d.id)) ?? DESKS.find((d) => !taken.has(d.id));
        if (!free) continue; // office full — agent is not rendered
        out.set(a.id, free.id);
        taken.add(free.id);
    }
    return out;
}

interface PulseRunInfo {
    title: string;
    startedAt: number;
    until: number;
    moduleId: string | null;
}

function toOfficeAgent(a: OsAgent, deskId: string, tasks: OsTask[], frozen: boolean, location: AgentLocation, pulse?: PulseRunInfo, huddle?: boolean): Agent {
    const mine = tasks.filter((t) => t.agentId === a.id);
    const active = mine.find((t) => t.status === "running") ?? mine.find((t) => t.status === "awaiting_approval");
    const modules = a.modules.filter(isModule);
    const desk = DESK_BY_ID[deskId];
    let status: AgentStatus;
    if (a.status === "offline") status = "offline";
    else if (a.status === "paused" || frozen) status = "paused";
    else if (huddle) status = "meeting";
    else if (active?.status === "awaiting_approval") status = "error";
    else if (active) status = active.progress < 0.02 ? "thinking" : "working";
    else if (pulse) status = "thinking";
    else status = location === "meeting" ? "meeting" : "idle";
    const s = a.stats ?? {};
    const pulseModule = pulse?.moduleId && isModule(pulse.moduleId) ? pulse.moduleId : modules[0] ?? "reports";
    return {
        id: a.slug,
        dbId: a.id,
        name: a.name,
        role: a.role,
        model: a.provider === "default" ? TIER_META[a.modelTier]?.label ?? a.modelTier : a.model,
        color: a.color,
        zone: desk?.zone ?? (WORK_ZONES.includes(a.zone as ZoneId) ? (a.zone as ZoneId) : "research"),
        deskId,
        status,
        location: status === "meeting" && huddle ? "meeting" : active || (pulse && status === "thinking") || status === "offline" ? "desk" : location,
        modules: modules.length ? modules : ["reports"],
        skills: a.skills,
        stats: { tasksCompleted: s.tasksCompleted ?? 0, successRate: s.successRate ?? 1, avgLatencyMs: s.avgLatencyMs ?? 1000, tokensToday: s.tokensToday ?? 0 },
        queued: mine.filter((t) => t.status === "queued").length,
        review: mine.filter((t) => t.status === "review").length,
        task: active
            ? {
                  id: active.id,
                  title: active.title,
                  progress: Math.max(0, Math.min(1, active.progress)),
                  startedAt: active.startedAt ? new Date(active.startedAt).getTime() : Date.now(),
                  moduleId: isModule(active.moduleId) ? active.moduleId : modules[0] ?? "reports",
                  route: active.route,
                  steps: active.steps.length ? active.steps : ["Working"],
              }
            : pulse && status === "thinking"
              ? {
                    id: `pulse-${a.slug}`,
                    title: `⏱ ${pulse.title}`,
                    progress: Math.min(0.9, (Date.now() - pulse.startedAt) / 20_000),
                    startedAt: pulse.startedAt,
                    moduleId: pulseModule,
                    route: MODULES[pulseModule].route,
                    steps: ["Gathering context", "Asking the model", "Drafting output"],
                }
              : undefined,
    };
}

function auditToActivity(e: OsAuditEntry): ActivityEntry {
    return {
        id: e.id,
        ts: new Date(e.createdAt).getTime(),
        agentId: e.actorType === "agent" ? e.actorId ?? undefined : undefined,
        level: e.level,
        message: e.summary || `${e.action} ${e.entity}`,
        moduleId: e.moduleId && isModule(e.moduleId) ? e.moduleId : undefined,
        route: e.route ?? undefined,
    };
}

export function createOsAgentSource(getState: () => { agents: Agent[] }): AgentDataSource {
    let emit: ((e: OfficeEvent) => void) | null = null;
    const locations = new Map<string, AgentLocation>();
    const timers: ReturnType<typeof setTimeout>[] = [];
    let stopPolling: (() => void) | null = null;
    let unsub: (() => void) | null = null;
    let cosmetic: ReturnType<typeof setInterval> | null = null;
    let auditTimer: ReturnType<typeof setInterval> | null = null;
    let since: string | undefined;
    /** Agents currently running a Pulse routine (slug → info), fed by audit `run_started`. */
    const pulseRuns = new Map<string, PulseRunInfo>();
    /** Agents briefing in the War Room for a workflow (slug → until ms), fed by audit `workflow_started`. */
    const huddles = new Map<string, number>();

    const log = (level: ActivityEntry["level"], message: string, agentId?: string) =>
        emit?.({ type: "activity", entry: { id: uid(), ts: Date.now(), level, message, agentId } });
    const chat = (agentId: string, from: ChatMessage["from"], text: string) => emit?.({ type: "chat", agentId, message: { id: uid(), from, text, ts: Date.now() } });
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const find = (id: string) => getState().agents.find((a) => a.id === id);

    const sync = () => {
        const { agents, tasks, settings, status } = useAosStore.getState();
        if (status !== "ready") return;
        const live = agents.filter((a) => !a.archivedAt);
        const desks = resolveDesks(live);
        const now = Date.now();
        for (const [slug, p] of pulseRuns) if (p.until < now) pulseRuns.delete(slug);
        for (const [slug, until] of huddles) if (until < now) (huddles.delete(slug), locations.set(slug, "desk"));
        const roster = live
            .filter((a) => desks.has(a.id))
            .map((a) => toOfficeAgent(a, desks.get(a.id)!, tasks, !!settings?.killSwitch, locations.get(a.slug) ?? "desk", pulseRuns.get(a.slug), huddles.has(a.slug)));
        for (const a of roster) if (a.location === "desk") locations.set(a.id, "desk");
        emit?.({ type: "roster", agents: roster });
        if (live.length > roster.length) log("warning", `The office is full — ${live.length - roster.length} agent(s) have no desk`);
    };

    /** A workflow just started: its agents gather in the War Room for a short briefing. */
    const startHuddle = (slugs: string[], workflowName: string) => {
        const agents = getState().agents;
        const group = slugs.filter((s) => agents.some((a) => a.id === s && a.status !== "offline" && a.status !== "paused")).slice(0, MEETING_SEATS.length);
        if (!group.length) return;
        // Make room: cosmetic meetings end when a real workflow needs the War Room.
        for (const a of agents) if (a.location === "meeting" && !group.includes(a.id) && !huddles.has(a.id)) locations.set(a.id, "desk");
        const until = Date.now() + HUDDLE_MS;
        for (const s of group) {
            huddles.set(s, until);
            locations.set(s, "meeting");
        }
        const names = group.map((s) => agents.find((a) => a.id === s)?.name ?? s);
        log("info", `War Room: ${names.join(", ")} brief on “${workflowName}”`, group[0]);
        later(HUDDLE_MS + 300, sync);
    };

    const pollAudit = async () => {
        try {
            const rows = await fetchAuditFiltered({ since, limit: since ? 40 : 30 });
            if (!rows.length) return;
            const firstLoad = !since;
            since = rows[0].createdAt;
            let pulseChanged = false;
            for (const r of [...rows].reverse()) {
                emit?.({ type: "activity", entry: auditToActivity(r) });
                // Pulse: wake the avatar while a routine runs (skip history on first load).
                if (!firstLoad && r.actorType === "agent" && r.actorId && r.entity === "routine") {
                    if (r.action === "run_started") {
                        const name = r.summary.match(/"(.+)"/)?.[1] ?? "Routine";
                        pulseRuns.set(r.actorId, { title: name, startedAt: new Date(r.createdAt).getTime(), until: Date.now() + 45_000, moduleId: r.moduleId });
                        pulseChanged = true;
                    } else if (r.action.startsWith("run_")) {
                        pulseRuns.delete(r.actorId);
                        pulseChanged = true;
                    }
                }
                // Workflows: the agents of a new run meet in the War Room.
                if (!firstLoad && r.action === "workflow_started") {
                    const slugs = Array.isArray(r.diff?.agentSlugs) ? (r.diff!.agentSlugs as unknown[]).filter((s): s is string => typeof s === "string") : [];
                    startHuddle([...new Set(slugs)], r.summary.match(/"(.+)"/)?.[1] ?? "workflow");
                    pulseChanged = true;
                }
            }
            if (pulseChanged) sync();
        } catch {
            /* backend hiccup — next poll retries */
        }
    };

    /** Cosmetic life: idle agents grab coffee or gather in the War Room. */
    const cosmeticTick = () => {
        const agents = getState().agents;
        const idle = agents.filter((a) => a.status === "idle" && a.location === "desk");
        const inMeeting = agents.filter((a) => a.location === "meeting");
        const inLounge = agents.filter((a) => a.location === "lounge");
        let changed = false;

        if (!inMeeting.length && idle.length >= 2 && Math.random() < 0.05) {
            const group = [...idle].sort(() => Math.random() - 0.5).slice(0, Math.min(4, MEETING_SEATS.length, idle.length));
            group.forEach((a) => locations.set(a.id, "meeting"));
            log("info", `${group[0].name} called “${pick(MEETING_TOPICS)}” with ${group.slice(1).map((a) => a.name).join(", ")}`, group[0].id);
            changed = true;
        } else if (inMeeting.length && Math.random() < 0.08) {
            inMeeting.forEach((a) => locations.set(a.id, "desk"));
            changed = true;
        }
        for (const a of inLounge) {
            if (Math.random() < 0.12) {
                locations.set(a.id, "desk");
                changed = true;
            }
        }
        const stillIdle = idle.filter((a) => locations.get(a.id) === "desk");
        if (stillIdle.length && inLounge.length < LOUNGE_SPOTS.length - 1 && Math.random() < 0.08) {
            const a = pick(stillIdle);
            locations.set(a.id, "lounge");
            log("info", `${a.name} is grabbing a virtual coffee ☕`, a.id);
            changed = true;
        }
        if (changed) sync();
    };

    const guarded = async (label: string, agentId: string | undefined, fn: () => Promise<unknown>) => {
        try {
            await fn();
            void useAosStore.getState().refresh();
            return true;
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            log("warning", /sign in|unauthori|authentication/i.test(msg) ? `${label}: sign in to the admin to control agents` : `${label} failed: ${msg}`, agentId);
            return false;
        }
    };

    const replyFor = (a: Agent, text: string): string => {
        const t = text.toLowerCase();
        if (/status|progress|how.*going|update|doing/.test(t)) {
            if (!a.task) return `I'm ${STATUS_META[a.status].label.toLowerCase()} right now${a.queued ? ` with ${a.queued} task(s) queued` : ""}. I work in ${a.modules.map((m) => MODULES[m].name).join(" and ")}.`;
            const step = a.task.steps[stepIndex(a.task.progress, a.task.steps.length)];
            return `In ${MODULES[a.task.moduleId].name}, working on “${a.task.title}” — about ${Math.round(a.task.progress * 100)}% done. Current step: ${step.toLowerCase()}.`;
        }
        if (/hello|hi\b|halo|hey/.test(t)) return `Hi! ${a.name} here, your ${a.role.toLowerCase()}. Queue work for me from the command bar or the Agentic OS.`;
        if (a.status === "error") return "I'm waiting for your approval — open Governance in the Agentic OS, or press Approve in my panel.";
        if (a.review) return `I have ${a.review} task(s) waiting for your review. I never close my own work — please confirm them in Tasks.`;
        return pick([
            "Noted. Send it through the command bar and I'll add it to my queue.",
            "Understood — I'll keep it in mind for my next playbook run.",
            "Good call. Want me to open a ticket in ITSM so the team can track it?",
        ]);
    };

    return {
        connect(fn) {
            emit = fn;
            emit({ type: "mode", mode: "live" });
            stopPolling = startAosPolling(POLL_MS);
            unsub = useAosStore.subscribe((s, prev) => {
                if (s.agents !== prev.agents || s.tasks !== prev.tasks || s.settings !== prev.settings || s.status !== prev.status) sync();
            });
            sync();
            void pollAudit();
            auditTimer = setInterval(pollAudit, POLL_MS);
            cosmetic = setInterval(cosmeticTick, 3000);
            return () => {
                emit = null;
                stopPolling?.();
                unsub?.();
                if (cosmetic) clearInterval(cosmetic);
                if (auditTimer) clearInterval(auditTimer);
                timers.forEach(clearTimeout);
            };
        },

        async dispatchTask({ title, agentId }) {
            const agents = getState().agents.filter((a) => a.status !== "offline");
            const inferred = inferModule(title);
            let target = agentId ? find(agentId) : undefined;
            if (!target) {
                const owners = inferred ? agents.filter((a) => a.modules.includes(inferred)) : [];
                const pool = owners.length ? owners : agents;
                target = [...pool].sort((a, b) => (a.queued ?? 0) + (a.task ? 1 : 0) - ((b.queued ?? 0) + (b.task ? 1 : 0)))[0];
            }
            if (!target?.dbId) {
                log("warning", `No available agent for “${title}”`);
                return null;
            }
            const moduleId = inferred && (agentId || target.modules.includes(inferred)) ? inferred : target.modules[0];
            const ok = await guarded(`Dispatch “${title}”`, target.id, () =>
                aosApi.createTask({ agentId: target!.dbId!, title, moduleId, route: MODULES[moduleId].route, steps: MODULES[moduleId].steps, source: "dispatch" }),
            );
            if (!ok) return null;
            chat(target.id, "system", `New task in ${MODULES[moduleId].name}: ${title}`);
            later(900, () => chat(target!.id, "agent", target!.task ? `Queued “${title}” — I'll start right after my current task.` : `Got it — starting “${title}” in ${MODULES[moduleId].name}.`));
            return target.id;
        },

        async sendMessage(agentId, text) {
            const a = find(agentId);
            if (!a) return;
            if (a.status === "offline") {
                later(300, () => chat(agentId, "system", `${a.name} is offline. Wake the agent to chat.`));
                return;
            }
            later(700 + Math.random() * 900, () => {
                const fresh = find(agentId);
                if (fresh) chat(agentId, "agent", replyFor(fresh, text));
            });
        },

        async command(agentId, cmd: AgentCommand) {
            const a = find(agentId);
            if (!a?.dbId) return;
            const id = a.dbId;
            switch (cmd) {
                case "pause":
                    await guarded("Pause", agentId, () => aosApi.updateAgent(id, { status: "paused" }, "Paused from the Virtual Office"));
                    break;
                case "resume":
                case "wake":
                    locations.set(agentId, "desk");
                    await guarded("Resume", agentId, () => aosApi.updateAgent(id, { status: "active" }, "Activated from the Virtual Office"));
                    break;
                case "shutdown":
                    await guarded("Shutdown", agentId, () => aosApi.updateAgent(id, { status: "offline" }, "Shut down from the Virtual Office"));
                    break;
                case "retry": {
                    const { approvals, tasks } = useAosStore.getState();
                    const ap = approvals.find((x) => x.agentId === id && x.status === "pending");
                    if (ap) {
                        await guarded("Approve", agentId, () => aosApi.decideApproval(ap.id, true, "Approved from the Virtual Office"));
                        break;
                    }
                    const failed = tasks.find((t) => t.agentId === id && t.status === "failed");
                    if (failed) await guarded("Retry", agentId, () => aosApi.retryTask(failed.id));
                    break;
                }
                case "recall":
                    locations.set(agentId, "desk");
                    log("info", `${a.name} was recalled to their desk`, agentId);
                    sync();
                    break;
                case "meeting":
                    if (getState().agents.filter((x) => x.location === "meeting").length >= MEETING_SEATS.length) {
                        log("warning", "The War Room is full");
                        break;
                    }
                    locations.set(agentId, "meeting");
                    log("info", `${a.name} joined the War Room`, agentId);
                    sync();
                    break;
                case "break":
                    locations.set(agentId, "lounge");
                    log("info", `${a.name} is taking a break in the Lounge`, agentId);
                    sync();
                    break;
            }
        },
    };
}
