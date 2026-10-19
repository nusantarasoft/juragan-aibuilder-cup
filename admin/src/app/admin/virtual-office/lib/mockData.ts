import { findTemplate } from "./modules";
import type { ActivityEntry, Agent, AgentTask } from "./types";

/**
 * Roster of Nusantarasoft AI agents aligned strictly with the current system:
 * Studio, Partner, Knowledge Research, Marketing Content, WA Conversations,
 * WhatsApp Gateway, Settings & Models, and Agentic OS.
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
    // ── AI Studio & Gateway (engineering zone) ─────────────────────────
    {
        id: "nakula", name: "Nakula", role: "AI Studio & Prompt Engineer", model: "Medium · Fast", color: "#22d3ee",
        zone: "engineering", deskId: "eng-1-a", status: "working", location: "desk",
        modules: ["ai-studio", "settings"],
        task: task("Evaluate RAG prompts for Partner assistant", 0.42, 6),
        skills: ["Prompt Engineering", "RAG Evals", "Playbooks"], stats: stats(54, 0.98, 820, 266_000),
    },
    {
        id: "arjuna", name: "Arjuna", role: "WhatsApp Gateway Engineer", model: "Large · Reasoning", color: "#38bdf8",
        zone: "engineering", deskId: "eng-1-b", status: "working", location: "desk",
        modules: ["whatsapp-gateway", "settings"],
        task: task("Verify WAHA session health & webhook latency", 0.61, 14),
        skills: ["WAHA Sessions", "Webhooks", "QR Pairing"], stats: stats(37, 0.96, 1400, 482_000),
    },
    {
        id: "gatot", name: "Gatotkaca", role: "Model & Guardrail Specialist", model: "Large · Reasoning", color: "#f43f5e",
        zone: "engineering", deskId: "eng-2-a", status: "working", location: "desk",
        modules: ["settings", "agentic-os"],
        task: task("Audit LLM provider latency & token guardrails", 0.64, 12),
        skills: ["LLM Providers", "Token Budgets", "Safety Guardrails"], stats: stats(18, 0.94, 1800, 158_000),
    },
    // ── Knowledge & Marketing (research zone) ──────────────────────────
    {
        id: "yudhis", name: "Yudhistira", role: "Knowledge Research Curator", model: "Small · Local", color: "#14b8a6",
        zone: "research", deskId: "res-1-a", status: "working", location: "desk",
        modules: ["knowledge", "ai-studio"],
        task: task("Deep research: UMKM market trends & FAQ", 0.55, 18),
        skills: ["Deep Research", "Web Scraping", "RAG Indexing"], stats: stats(47, 0.99, 540, 133_000),
    },
    {
        id: "drupadi", name: "Drupadi", role: "Marketing Content Strategist", model: "Large · Reasoning", color: "#fb7185",
        zone: "research", deskId: "res-1-b", status: "thinking", location: "desk",
        modules: ["marketing", "knowledge"],
        task: task("Draft weekly WhatsApp & social promo campaign", 0.25, 4),
        skills: ["Copywriting", "Brochures", "Campaign Strategy"], stats: stats(26, 0.95, 1900, 401_000),
    },
    {
        id: "kresna", name: "Kresna", role: "Partner & UMKM Growth Lead", model: "Large · Reasoning", color: "#a855f7",
        zone: "research", deskId: "res-2-a", status: "working", location: "desk",
        modules: ["partner", "marketing"],
        task: task("Review UMKM partner onboarding & catalog", 0.48, 11),
        skills: ["Partner Onboarding", "Store Catalog", "UMKM Growth"], stats: stats(33, 0.96, 1500, 320_000),
    },
    // ── WhatsApp & Partner Ops (operations zone) ───────────────────────
    {
        id: "semar", name: "Semar", role: "WA Conversations & CS Agent", model: "Medium · Fast", color: "#60a5fa",
        zone: "operations", deskId: "ops-1", status: "working", location: "desk",
        modules: ["wa-conversations", "knowledge"],
        task: task("Triage 6 unread WhatsApp customer chats", 0.33, 9),
        skills: ["WA Shared Inbox", "CS Triage", "Reply Drafting"], stats: stats(88, 0.97, 700, 356_000),
    },
    {
        id: "petruk", name: "Petruk", role: "Agentic OS Orchestrator", model: "Medium · Fast", color: "#fb923c",
        zone: "operations", deskId: "ops-2", status: "working", location: "desk",
        modules: ["agentic-os", "wa-conversations", "partner"],
        task: task("Morning multi-agent situation report", 0.18, 4),
        skills: ["Workflows", "Pulse Routines", "Governance"], stats: stats(21, 0.95, 880, 91_000),
    },
];

export const MEETING_TOPICS = [
    "WA Conversations handover review",
    "Partner UMKM onboarding sync",
    "Weekly Marketing Content campaign planning",
    "AI Studio RAG groundedness review",
];

export function initialActivity(): ActivityEntry[] {
    const now = Date.now();
    return [
        { id: "a1", ts: now - 40_000, agentId: "semar", level: "info", moduleId: "wa-conversations", route: "/admin/ai-studio/messages", message: "Semar triaged 6 unread WhatsApp customer threads in Messages" },
        { id: "a2", ts: now - 95_000, agentId: "yudhis", level: "success", moduleId: "knowledge", route: "/admin/ai-studio/knowledge-research", message: "Yudhistira indexed new UMKM FAQ sources into Knowledge Research" },
        { id: "a3", ts: now - 160_000, agentId: "drupadi", level: "info", moduleId: "marketing", route: "/admin/ai-studio/showcase", message: "Drupadi synthesized new HUD showcase cards in Showcase" },
        { id: "a4", ts: now - 300_000, agentId: "kresna", level: "success", moduleId: "partner", route: "/admin/ai-studio/partner", message: "Kresna verified Partner store catalog and Kasir WA summary" },
    ];
}
