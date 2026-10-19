/**
 * Catalog of active Nusantarasoft modules that AI agents operate in.
 * Aligned strictly with the current AI Studio + WhatsApp + Partner + Agentic OS system.
 */

export type ModuleId =
    | "ai-studio"
    | "partner"
    | "knowledge"
    | "marketing"
    | "wa-conversations"
    | "whatsapp-gateway"
    | "settings"
    | "agentic-os";

export interface ModuleInfo {
    id: ModuleId;
    name: string;
    /** Default landing route for this module. */
    route: string;
    color: string;
    /** Used to infer the module from free-text tasks. */
    keywords: string[];
    /** Generic steps used for ad-hoc tasks dispatched to this module. */
    steps: string[];
}

export const MODULES: Record<ModuleId, ModuleInfo> = {
    "ai-studio": {
        id: "ai-studio",
        name: "Studio",
        route: "/admin/ai-studio",
        color: "#a78bfa",
        keywords: ["studio", "notebook", "prompt", "rag", "embedding", "eval", "playbook", "ai studio"],
        steps: ["Open AI Studio", "Load notebook & sources", "Run prompt evaluation", "Verify grounded citations", "Save notebook output"],
    },
    partner: {
        id: "partner",
        name: "Partner",
        route: "/admin/ai-studio/partner",
        color: "#34d399",
        keywords: ["partner", "umkm", "store", "toko", "kasir", "catalog", "onboarding", "merchant", "sales"],
        steps: ["Open Partner workspace", "Review store profile & catalog", "Check Kasir WA transactions", "Prepare partner recommendations"],
    },
    knowledge: {
        id: "knowledge",
        name: "Knowledge Research",
        route: "/admin/ai-studio/riset-knowledge",
        color: "#2dd4bf",
        keywords: ["knowledge", "research", "riset", "kb", "article", "faq", "source", "scrape", "crawl", "docs"],
        steps: ["Open Knowledge Research", "Crawl & verify reference sources", "Synthesize key findings", "Index chunks into notebook KB"],
    },
    marketing: {
        id: "marketing",
        name: "Marketing Content",
        route: "/admin/ai-studio/konten-marketing",
        color: "#fb7185",
        keywords: ["marketing", "konten", "content", "copywriting", "campaign", "brochure", "social", "post", "promo"],
        steps: ["Open Marketing Content", "Review brand voice & audience", "Draft campaign copy & visuals", "Queue content for review"],
    },
    "wa-conversations": {
        id: "wa-conversations",
        name: "WA Conversations",
        route: "/admin/ai-studio/percakapan-wa",
        color: "#60a5fa",
        keywords: ["wa", "whatsapp", "percakapan", "chat", "inbox", "customer", "reply", "conversation", "handover"],
        steps: ["Open WA Conversations inbox", "Triage unread customer threads", "Search KB for accurate answer", "Draft customer reply for approval"],
    },
    "whatsapp-gateway": {
        id: "whatsapp-gateway",
        name: "WhatsApp Gateway",
        route: "/admin/ai-studio/ai-gateway",
        color: "#38bdf8",
        keywords: ["gateway", "waha", "session", "qr", "webhook", "pairing", "connection", "number"],
        steps: ["Open WhatsApp Gateway", "Check active WAHA sessions", "Verify webhook delivery & latency", "Confirm session health"],
    },
    settings: {
        id: "settings",
        name: "Settings & Models",
        route: "/admin/ai-studio/settings",
        color: "#f43f5e",
        keywords: ["setting", "model", "provider", "gemini", "openai", "api key", "embedding", "quota", "guardrail"],
        steps: ["Open Settings & Models", "Check LLM provider connectivity", "Audit token usage & latency", "Update model fallback order"],
    },
    "agentic-os": {
        id: "agentic-os",
        name: "Agentic OS",
        route: "/admin/agentic-os",
        color: "#818cf8",
        keywords: ["agentic", "workflow", "pulse", "routine", "governance", "approval", "memory", "goal", "agent"],
        steps: ["Open Agentic OS", "Scan active agent queues & goals", "Check pending human approvals", "Publish orchestration summary"],
    },
};

/** Safe lookup that falls back to Studio if a legacy moduleId is encountered. */
export function getModuleInfo(id?: string | null): ModuleInfo {
    if (id && id in MODULES) return MODULES[id as ModuleId];
    return MODULES["ai-studio"];
}

export interface TaskTemplate {
    moduleId: ModuleId;
    route: string;
    title: string;
    steps: string[];
}

/** Realistic task scripts per active module. Agents pick from the modules they own. */
export const TASK_TEMPLATES: TaskTemplate[] = [
    // Studio
    {
        moduleId: "ai-studio",
        route: "/admin/ai-studio",
        title: "Evaluate RAG prompts for Partner assistant",
        steps: ["Open Studio notebook", "Load 25 customer test questions", "Run groundedness evaluation", "Save winning system prompt"],
    },
    {
        moduleId: "ai-studio",
        route: "/admin/ai-studio",
        title: "Re-index studio source chunks (768-dim)",
        steps: ["Open Studio sources panel", "Detect unindexed documents", "Run Google AI 768-dim embeddings", "Verify semantic retrieval"],
    },
    // Partner
    {
        moduleId: "partner",
        route: "/admin/ai-studio/partner",
        title: "Review UMKM partner onboarding & catalog",
        steps: ["Open Partner workspace", "Verify new store registrations", "Check product catalog completeness", "Approve store readiness"],
    },
    {
        moduleId: "partner",
        route: "/admin/ai-studio/partner",
        title: "Audit daily Kasir WA sales summary",
        steps: ["Open Partner sales view", "Compare pending vs confirmed orders", "Flag low-stock catalog items", "Prepare daily partner digest"],
    },
    // Knowledge Research
    {
        moduleId: "knowledge",
        route: "/admin/ai-studio/riset-knowledge",
        title: "Deep research: UMKM market trends & FAQ",
        steps: ["Open Knowledge Research", "Collect verified industry sources", "Synthesize FAQ knowledge article", "Publish to shared notebook"],
    },
    {
        moduleId: "knowledge",
        route: "/admin/ai-studio/riset-knowledge",
        title: "Curate KB articles from recent WA chats",
        steps: ["Review resolved WA questions", "Extract recurring customer topics", "Draft structured KB entry", "Submit for human review"],
    },
    // Marketing Content
    {
        moduleId: "marketing",
        route: "/admin/ai-studio/konten-marketing",
        title: "Draft weekly WhatsApp & social promo campaign",
        steps: ["Open Marketing Content", "Select target partner persona", "Generate campaign copy & visual brief", "Queue draft for approval"],
    },
    {
        moduleId: "marketing",
        route: "/admin/ai-studio/konten-marketing",
        title: "Generate digital brochure copy for new catalog",
        steps: ["Load top-selling partner products", "Write headline & benefit bullets", "Attach product media", "Save brochure draft"],
    },
    // WA Conversations
    {
        moduleId: "wa-conversations",
        route: "/admin/ai-studio/percakapan-wa",
        title: "Triage 6 unread WhatsApp customer chats",
        steps: ["Open WA Conversations shared inbox", "Classify customer intent", "Retrieve answers from Knowledge Base", "Draft replies for human handover"],
    },
    {
        moduleId: "wa-conversations",
        route: "/admin/ai-studio/percakapan-wa",
        title: "Follow up pending order confirmations on WA",
        steps: ["Filter awaiting-confirmation threads", "Verify stock in Partner catalog", "Draft polite follow-up message", "Request human send approval"],
    },
    // WhatsApp Gateway
    {
        moduleId: "whatsapp-gateway",
        route: "/admin/ai-studio/ai-gateway",
        title: "Verify WAHA session health & webhook latency",
        steps: ["Open WhatsApp Gateway", "Check session connection status", "Inspect webhook delivery logs", "Confirm 0 dropped messages"],
    },
    // Settings & Models
    {
        moduleId: "settings",
        route: "/admin/ai-studio/settings",
        title: "Audit LLM provider latency & token guardrails",
        steps: ["Open Settings & Models", "Test Gemini & fallback model latency", "Review daily token consumption", "Record health status"],
    },
    // Agentic OS
    {
        moduleId: "agentic-os",
        route: "/admin/agentic-os",
        title: "Morning multi-agent situation report",
        steps: ["Open Agentic OS Command Deck", "Scan overnight runs & approvals", "Check goal progress against gates", "Publish morning briefing"],
    },
];

export function templatesFor(moduleIds: ModuleId[]): TaskTemplate[] {
    return TASK_TEMPLATES.filter((t) => moduleIds.includes(t.moduleId));
}

export function findTemplate(title: string): TaskTemplate {
    const t = TASK_TEMPLATES.find((x) => x.title === title);
    if (!t) return TASK_TEMPLATES[0];
    return t;
}

/** Best-matching module for a free-text task, or null. */
export function inferModule(text: string): ModuleId | null {
    const t = text.toLowerCase();
    let best: ModuleId | null = null;
    let bestScore = 0;
    for (const m of Object.values(MODULES)) {
        const score = m.keywords.reduce((s, k) => s + (t.includes(k) ? k.length : 0), 0);
        if (score > bestScore) {
            best = m.id;
            bestScore = score;
        }
    }
    return best;
}

/** Index of the step the agent is currently performing. */
export function stepIndex(progress: number, stepCount: number): number {
    if (stepCount <= 0) return 0;
    return Math.min(stepCount - 1, Math.floor(progress * stepCount));
}

/** URL to watch an agent inside a module page. */
export function sessionUrl(route: string, agentId: string, embed = false): string {
    const q = new URLSearchParams({ agentSession: agentId });
    if (embed) q.set("embed", "agent");
    return `${route}${route.includes("?") ? "&" : "?"}${q.toString()}`;
}

/** Parent (Virtual Office) → iframe (module page): live agent state. */
export const AGENT_SNAPSHOT_MESSAGE = "ns-office:agent-snapshot";
/** Iframe → parent: ask for the current agent state as soon as the overlay mounts. */
export const AGENT_SNAPSHOT_REQUEST = "ns-office:agent-snapshot-request";
