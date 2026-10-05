import { findTemplate } from "./modules";
import type { ActivityEntry, Agent, AgentTask } from "./types";

/**
 * Demo roster. Replace with agents loaded from your AI-agent backend.
 * Each agent operates in real Nusantarasoft modules (see `modules.ts`).
 * Names follow the wayang tradition to keep it on-brand for Nusantarasoft.
 */

const stats = (tasksCompleted: number, successRate: number, avgLatencyMs: number, tokensToday: number) => ({
    tasksCompleted,
    successRate,
    avgLatencyMs,
    tokensToday,
});

/** Start an agent mid-way through one of the module task scripts. */
const task = (title: string, progress: number, minutesAgo: number): AgentTask => {
    const t = findTemplate(title);
    return {
        id: `t-${Math.random().toString(36).slice(2, 9)}`,
        title: t.title,
        moduleId: t.moduleId,
        route: t.route,
        steps: t.steps,
        progress,
        startedAt: Date.now() - minutesAgo * 60_000,
    };
};

export const INITIAL_AGENTS: Agent[] = [
    // ── Engineering & Infra ────────────────────────────────────────────
    {
        id: "arjuna", name: "Arjuna", role: "DevOps Engineer", model: "Large · Reasoning", color: "#38bdf8",
        zone: "engineering", deskId: "eng-1-a", status: "working", location: "desk",
        modules: ["devops", "infrastructure"],
        task: task("Rebuild admin container & smoke test", 0.42, 6),
        skills: ["Docker", "CI/CD", "Kong", "Observability"], stats: stats(37, 0.96, 1400, 482_000),
    },
    {
        id: "bima", name: "Bima", role: "Infrastructure Engineer", model: "Large · Reasoning", color: "#f97316",
        zone: "engineering", deskId: "eng-1-b", status: "working", location: "desk",
        modules: ["infrastructure", "dcim"],
        task: task("Investigate 5xx spike on Kong", 0.61, 14),
        skills: ["Networking", "Prometheus", "Capacity planning"], stats: stats(29, 0.93, 1650, 391_000),
    },
    {
        id: "nakula", name: "Nakula", role: "AI Quality Engineer", model: "Medium · Fast", color: "#22d3ee",
        zone: "engineering", deskId: "eng-2-a", status: "thinking", location: "desk",
        modules: ["ai-studio", "devops"],
        task: task("Evaluate prompts for the support bot", 0.05, 1),
        skills: ["Evals", "Prompting", "Playwright"], stats: stats(54, 0.98, 820, 266_000),
    },
    {
        id: "sadewa", name: "Sadewa", role: "Facilities Engineer", model: "Medium · Fast", color: "#84cc16",
        zone: "engineering", deskId: "eng-2-b", status: "working", location: "desk",
        modules: ["bms", "inventory", "dcim"],
        task: task("Investigate energy spike in Tower A", 0.22, 5),
        skills: ["HVAC", "Energy", "Work orders"], stats: stats(41, 0.95, 960, 204_000),
    },
    {
        id: "gatot", name: "Gatotkaca", role: "Security Analyst", model: "Large · Reasoning", color: "#f43f5e",
        zone: "engineering", deskId: "eng-3-a", status: "error", location: "desk",
        modules: ["security"],
        task: task("Dependency audit — 2 critical CVEs", 0.64, 12),
        skills: ["SAST", "Dependency audit", "OWASP"], stats: stats(18, 0.89, 2100, 158_000),
    },
    {
        id: "srikandi", name: "Srikandi", role: "Project Manager", model: "Large · Reasoning", color: "#ec4899",
        zone: "engineering", deskId: "eng-3-b", status: "idle", location: "desk",
        modules: ["pm", "hr"],
        skills: ["Planning", "Stakeholders", "Hiring"], stats: stats(63, 0.97, 1100, 312_000),
    },
    // ── Business Insights ──────────────────────────────────────────────
    {
        id: "kresna", name: "Kresna", role: "Strategy Lead", model: "Large · Reasoning", color: "#a855f7",
        zone: "research", deskId: "res-1-a", status: "meeting", location: "meeting",
        modules: ["command-center", "reports"],
        skills: ["Strategy", "Synthesis", "KPIs"], stats: stats(22, 0.94, 2400, 520_000),
    },
    {
        id: "larasati", name: "Larasati", role: "Finance Analyst", model: "Medium · Fast", color: "#eab308",
        zone: "research", deskId: "res-1-b", status: "working", location: "desk",
        modules: ["accounting", "reports"],
        task: task("Reconcile September bank statements", 0.55, 22),
        skills: ["Reconciliation", "SQL", "Forecasting"], stats: stats(33, 0.95, 1300, 287_000),
    },
    {
        id: "yudhis", name: "Yudhistira", role: "Knowledge Curator", model: "Small · Local", color: "#14b8a6",
        zone: "research", deskId: "res-2-a", status: "meeting", location: "meeting",
        modules: ["knowledge", "ai-studio"],
        skills: ["RAG", "Embeddings", "Technical writing"], stats: stats(47, 0.99, 540, 133_000),
    },
    {
        id: "drupadi", name: "Drupadi", role: "Sales & Market Analyst", model: "Large · Reasoning", color: "#fb7185",
        zone: "research", deskId: "res-2-b", status: "thinking", location: "desk",
        modules: ["crm", "news"],
        task: task("Score new leads in the pipeline", 0.08, 3),
        skills: ["Lead scoring", "Web research", "Copywriting"], stats: stats(26, 0.92, 2600, 401_000),
    },
    // ── Service Desk ───────────────────────────────────────────────────
    {
        id: "semar", name: "Semar", role: "Service Desk Agent", model: "Medium · Fast", color: "#60a5fa",
        zone: "operations", deskId: "ops-1", status: "working", location: "desk",
        modules: ["itsm", "knowledge"],
        task: task("Resolve INC-2041 (login loop)", 0.33, 9),
        skills: ["Triage", "Customer comms", "ITIL"], stats: stats(88, 0.97, 700, 356_000),
    },
    {
        id: "petruk", name: "Petruk", role: "Incident Commander", model: "Medium · Fast", color: "#fb923c",
        zone: "operations", deskId: "ops-2", status: "working", location: "desk",
        modules: ["command-center", "ops", "itsm"],
        task: task("Morning situation report", 0.18, 4),
        skills: ["Runbooks", "Escalation", "Root cause"], stats: stats(15, 0.93, 880, 91_000),
    },
    {
        id: "gareng", name: "Gareng", role: "SCADA Monitoring Agent", model: "Small · Local", color: "#4ade80",
        zone: "operations", deskId: "ops-3", status: "offline", location: "desk",
        modules: ["scada", "bms"],
        skills: ["Alarms", "Sensor trends", "Field dispatch"], stats: stats(9, 0.99, 300, 0),
    },
];

export const MEETING_TOPICS = [
    "Major incident review: INC-2041",
    "Sprint 24 planning",
    "Q3 executive report sync",
    "Release 3.8 go/no-go",
];

export function initialActivity(): ActivityEntry[] {
    const now = Date.now();
    return [
        { id: "a1", ts: now - 40_000, agentId: "gatot", level: "error", moduleId: "security", route: "/admin/security/pentest", message: "Gatotkaca flagged 2 critical CVEs and is waiting for approval" },
        { id: "a2", ts: now - 95_000, agentId: "kresna", level: "info", message: "Kresna started “Major incident review: INC-2041” in the War Room" },
        { id: "a3", ts: now - 160_000, agentId: "semar", level: "info", moduleId: "itsm", route: "/admin/itsm/tickets", message: "Semar picked up “Resolve INC-2041 (login loop)”" },
        { id: "a4", ts: now - 300_000, agentId: "larasati", level: "success", moduleId: "accounting", route: "/admin/accounting/payables", message: "Larasati cleared 14 supplier invoices" },
    ];
}
