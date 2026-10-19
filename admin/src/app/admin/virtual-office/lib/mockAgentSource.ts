import { LOUNGE_SPOTS, MEETING_SEATS, STATUS_META } from "./floorplan";
import { MEETING_TOPICS } from "./mockData";
import { MODULES, inferModule, stepIndex, templatesFor, type ModuleId, type TaskTemplate } from "./modules";
import type { ActivityLevel, Agent, AgentCommand, AgentDataSource, AgentTask, ChatMessage, OfficeEvent } from "./types";

/**
 * Local simulation that behaves like a real agent backend would:
 * it only talks to the UI through `OfficeEvent`s.
 *
 * Agents pick up task scripts in the modules they own (ITSM, Command Center,
 * DevOps, …) and report every step they perform in that module.
 *
 * To connect real AI agents, implement `AgentDataSource` with your transport
 * (socket.io is already used in this app) and pass it to the store instead.
 */

const TICK_MS = 2000;

const uid = () => Math.random().toString(36).slice(2, 10);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(min + Math.random() * (max - min));

const AVAILABLE = (a: Agent) => a.status === "idle" && a.location !== "meeting";

const fromTemplate = (t: TaskTemplate): AgentTask => ({
    id: uid(),
    title: t.title,
    moduleId: t.moduleId,
    route: t.route,
    steps: t.steps,
    progress: 0,
    startedAt: Date.now(),
});

const adHocTask = (title: string, moduleId: ModuleId): AgentTask => ({
    id: uid(),
    title,
    moduleId,
    route: MODULES[moduleId].route,
    steps: MODULES[moduleId].steps,
    progress: 0,
    startedAt: Date.now(),
});

export function createMockAgentSource(getState: () => { agents: Agent[] }): AgentDataSource {
    let emit: ((e: OfficeEvent) => void) | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    const timeouts = new Set<ReturnType<typeof setTimeout>>();

    const later = (ms: number, fn: () => void) => {
        const t = setTimeout(() => {
            timeouts.delete(t);
            fn();
        }, ms);
        timeouts.add(t);
    };

    const find = (id: string) => getState().agents.find((a) => a.id === id);
    const patch = (agentId: string, p: Partial<Omit<Agent, "id">>) => emit?.({ type: "agent.patch", agentId, patch: p });
    const log = (level: ActivityLevel, message: string, agentId?: string, task?: Pick<AgentTask, "moduleId" | "route">) =>
        emit?.({
            type: "activity",
            entry: { id: uid(), ts: Date.now(), level, message, agentId, moduleId: task?.moduleId, route: task?.route },
        });
    const chat = (agentId: string, from: ChatMessage["from"], text: string) =>
        emit?.({ type: "chat", agentId, message: { id: uid(), from, text, ts: Date.now() } });

    const tick = () => {
        const { agents } = getState();
        let loungeCount = agents.filter((a) => a.location === "lounge").length;
        const meetingCount = agents.filter((a) => a.location === "meeting").length;

        // Occasionally an idle agent calls a meeting.
        if (meetingCount === 0 && Math.random() < 0.04) {
            const free = agents.filter(AVAILABLE).sort(() => Math.random() - 0.5).slice(0, randInt(2, 4));
            if (free.length >= 2) {
                const topic = pick(MEETING_TOPICS);
                free.forEach((a) => patch(a.id, { status: "meeting", location: "meeting" }));
                log("info", `${free[0].name} called “${topic}” with ${free.slice(1).map((a) => a.name).join(", ")}`, free[0].id);
                return;
            }
        }

        if (Math.random() < 0.04) {
            log("info", pick([
                "Orchestrator rebalanced the task queue",
                "Knowledge base re-indexed (1,204 chunks)",
                "Nightly evaluation suite passed 97/100",
                "Token budget at 41% for today",
            ]));
        }

        for (const a of agents) {
            const r = Math.random();
            switch (a.status) {
                case "working": {
                    const t = a.task;
                    if (!t) {
                        patch(a.id, { status: "idle" });
                        break;
                    }
                    const progress = Math.min(1, t.progress + 0.02 + Math.random() * 0.05);
                    const tokensToday = a.stats.tokensToday + randInt(300, 1800);
                    if (progress < 1) {
                        patch(a.id, { task: { ...t, progress }, stats: { ...a.stats, tokensToday } });
                        const before = stepIndex(t.progress, t.steps.length);
                        const after = stepIndex(progress, t.steps.length);
                        if (after > before) log("info", `${a.name}: ${t.steps[after]}`, a.id, t);
                    } else if (Math.random() > 0.07) {
                        patch(a.id, {
                            status: "idle",
                            task: undefined,
                            stats: { ...a.stats, tokensToday, tasksCompleted: a.stats.tasksCompleted + 1 },
                        });
                        log("success", `${a.name} completed “${t.title}” in ${MODULES[t.moduleId].name}`, a.id, t);
                    } else {
                        patch(a.id, { status: "error", task: { ...t, progress: 0.92 } });
                        log("error", `${a.name} is blocked on “${t.title}” and needs review`, a.id, t);
                    }
                    break;
                }
                case "thinking":
                    if (r < 0.3 && a.task) {
                        patch(a.id, { status: "working" });
                        log("info", `${a.name} opened ${MODULES[a.task.moduleId].name}: ${a.task.steps[stepIndex(a.task.progress, a.task.steps.length)]}`, a.id, a.task);
                    }
                    break;
                case "idle":
                    if (a.location === "lounge") {
                        if (r < 0.12) patch(a.id, { location: "desk" });
                    } else if (r < 0.08) {
                        const pool = templatesFor(a.modules);
                        if (pool.length) {
                            const task = fromTemplate(pick(pool));
                            patch(a.id, { status: "thinking", task });
                            log("info", `${a.name} picked up “${task.title}” in ${MODULES[task.moduleId].name}`, a.id, task);
                        }
                    } else if (r < 0.11 && loungeCount < LOUNGE_SPOTS.length - 1) {
                        loungeCount++;
                        patch(a.id, { location: "lounge" });
                        log("info", `${a.name} is grabbing a virtual coffee ☕`, a.id);
                    }
                    break;
                case "meeting":
                    if (r < 0.05) {
                        patch(a.id, { status: "idle", location: "desk" });
                        log("info", `${a.name} left the War Room`, a.id);
                    }
                    break;
                default:
                    break;
            }
        }
    };

    /** Prefer an available agent that owns the module, then any available agent. */
    const chooseAgent = (moduleId: ModuleId | null): Agent | undefined => {
        const available = getState().agents.filter(AVAILABLE);
        if (!available.length) return undefined;
        if (moduleId) {
            const owners = available.filter((a) => a.modules.includes(moduleId));
            if (owners.length) return pick(owners);
        }
        return pick(available);
    };

    const replyFor = (a: Agent, text: string): string => {
        const t = text.toLowerCase();
        if (/status|progress|how.*going|update|doing/.test(t)) {
            if (!a.task) return `I'm ${STATUS_META[a.status].label.toLowerCase()} right now. I usually work in ${a.modules.map((m) => MODULES[m].name).join(" and ")}.`;
            const step = a.task.steps[stepIndex(a.task.progress, a.task.steps.length)];
            return `In ${MODULES[a.task.moduleId].name}, working on “${a.task.title}” — about ${Math.round(a.task.progress * 100)}% done. Current step: ${step.toLowerCase()}. Click my monitor to watch.`;
        }
        if (/hello|hi\b|halo|hey/.test(t)) return `Hi! ${a.name} here, your ${a.role.toLowerCase()}. What can I take off your plate?`;
        if (a.status === "error") return "I'm blocked at the moment — approve or retry the task from the panel and I'll continue.";
        return pick([
            "On it. I'll fold that into my current plan and report back.",
            "Noted — drafting an approach now. I'll ping you if I need a decision.",
            "Good call. Want me to queue a task in Agentic OS so the team can track it?",
            "Understood. I'll coordinate with the others in the Core if needed.",
        ]);
    };

    return {
        connect(fn) {
            emit = fn;
            interval = setInterval(tick, TICK_MS);
            return () => {
                emit = null;
                if (interval) clearInterval(interval);
                timeouts.forEach(clearTimeout);
                timeouts.clear();
            };
        },

        async dispatchTask({ title, agentId }) {
            const inferred = inferModule(title);
            const target = agentId ? find(agentId) : chooseAgent(inferred);
            if (!target || target.status === "offline") {
                log("warning", `No available agent for “${title}” — added to the queue`);
                return null;
            }
            const moduleId = inferred && (agentId ? true : target.modules.includes(inferred)) ? inferred : target.modules[0];
            const task = adHocTask(title, moduleId);
            patch(target.id, { status: "thinking", location: "desk", task });
            log("info", `You assigned “${title}” to ${target.name} (${MODULES[moduleId].name})`, target.id, task);
            chat(target.id, "system", `New task in ${MODULES[moduleId].name}: ${title}`);
            later(900, () => chat(target.id, "agent", `Got it — planning “${title}” in ${MODULES[moduleId].name} now.`));
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
            if (!a) return;
            switch (cmd) {
                case "pause":
                    patch(agentId, { status: "paused" });
                    log("warning", `${a.name} was paused by you`, agentId, a.task);
                    break;
                case "resume":
                    patch(agentId, { status: a.task ? "working" : "idle" });
                    log("info", `${a.name} resumed`, agentId, a.task);
                    break;
                case "recall":
                    patch(agentId, { location: "desk", status: a.status === "meeting" ? "idle" : a.status });
                    log("info", `${a.name} was recalled to their desk`, agentId);
                    break;
                case "meeting": {
                    const inMeeting = getState().agents.filter((x) => x.location === "meeting").length;
                    if (inMeeting >= MEETING_SEATS.length) {
                        log("warning", "The War Room is full");
                        break;
                    }
                    patch(agentId, { status: "meeting", location: "meeting" });
                    log("info", `${a.name} joined the War Room`, agentId);
                    break;
                }
                case "break":
                    patch(agentId, { location: "lounge", status: "idle" });
                    log("info", `${a.name} is taking a break in the Lounge`, agentId);
                    break;
                case "retry":
                    patch(agentId, {
                        status: "thinking",
                        task: a.task ? { ...a.task, progress: Math.max(0, a.task.progress - 0.25) } : undefined,
                    });
                    log("info", `${a.name} is retrying “${a.task?.title ?? "the last task"}”`, agentId, a.task);
                    break;
                case "wake":
                    patch(agentId, { status: "idle", location: "desk" });
                    log("success", `${a.name} is back online`, agentId);
                    break;
                case "shutdown":
                    patch(agentId, { status: "offline", location: "desk", task: undefined });
                    log("warning", `${a.name} was shut down`, agentId);
                    break;
            }
        },
    };
}
