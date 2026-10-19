/**
 * Agentic OS — static catalogs: tools, model providers, agent templates.
 * Aligned strictly with the current AI Studio + Partner + WhatsApp + Agentic OS system.
 */

import type { Effort, ModelTier, Permission } from "./types";

export type ToolRisk = "read" | "draft" | "write" | "send" | "delete";

export interface ToolDef {
    id: string;
    name: string;
    description: string;
    risk: ToolRisk;
    group: "Modules" | "Knowledge" | "Communication" | "Engineering" | "Data" | "System";
}

export const TOOL_CATALOG: ToolDef[] = [
    { id: "module.read", name: "Read module pages", description: "Open and read any AI Studio / Partner module it has access to", risk: "read", group: "Modules" },
    { id: "module.draft", name: "Draft changes", description: "Prepare notebook, catalog, or content drafts for human review", risk: "draft", group: "Modules" },
    { id: "module.write", name: "Write to modules", description: "Create / update Studio or Partner records directly", risk: "write", group: "Modules" },
    { id: "playbook.run", name: "Run playbooks", description: "Execute assigned playbooks step by step", risk: "write", group: "Modules" },
    { id: "kb.search", name: "Search knowledge", description: "Semantic search in Studio RAG notebooks & memory map", risk: "read", group: "Knowledge" },
    { id: "kb.write", name: "Write knowledge", description: "Create Knowledge Research notes and memory items", risk: "write", group: "Knowledge" },
    { id: "web.search", name: "Web research", description: "Search and verify public web sources for Knowledge Research", risk: "read", group: "Knowledge" },
    { id: "whatsapp.send", name: "WhatsApp messages", description: "Send WhatsApp messages via WAHA gateway", risk: "send", group: "Communication" },
    { id: "chat.notify", name: "Notify team", description: "Post notifications to the team inbox", risk: "send", group: "Communication" },
    { id: "email.draft", name: "Draft customer replies", description: "Prepare customer reply drafts — never sends automatically", risk: "draft", group: "Communication" },
    { id: "email.send", name: "Send outbound messages", description: "Send approved outbound communications", risk: "send", group: "Communication" },
    { id: "report.generate", name: "Generate insights", description: "Build Partner & Marketing performance summaries", risk: "write", group: "Data" },
    { id: "db.query", name: "Query data", description: "Read-only analytics & catalog queries", risk: "read", group: "Data" },
    { id: "runbook.execute", name: "Execute gateway checks", description: "Run WhatsApp Gateway & model health diagnostics", risk: "write", group: "Engineering" },
    { id: "pipeline.trigger", name: "Trigger indexing", description: "Start RAG embedding & chunk re-indexing jobs", risk: "write", group: "Engineering" },
    { id: "ticket.create", name: "Create follow-up tasks", description: "Open escalation tasks in Agentic OS", risk: "write", group: "Modules" },
    { id: "ticket.comment", name: "Add review notes", description: "Post internal notes on WA threads or tasks", risk: "write", group: "Modules" },
    { id: "record.delete", name: "Delete records", description: "Remove records permanently", risk: "delete", group: "System" },
    { id: "activity.log", name: "Activity log", description: "Write to the Virtual Office activity feed", risk: "read", group: "System" },
];

export const TOOL_BY_ID = Object.fromEntries(TOOL_CATALOG.map((t) => [t.id, t])) as Record<string, ToolDef>;

export const RISK_META: Record<ToolRisk, { label: string; color: string }> = {
    read: { label: "Read", color: "#22c55e" },
    draft: { label: "Draft", color: "#38bdf8" },
    write: { label: "Write", color: "#f59e0b" },
    send: { label: "Send", color: "#f97316" },
    delete: { label: "Delete", color: "#ef4444" },
};

export const PERMISSION_LEVELS: { id: Permission; label: string; color: string; hint: string }[] = [
    { id: "none", label: "None", color: "#475569", hint: "No access" },
    { id: "read", label: "Read", color: "#22c55e", hint: "Can look, cannot change" },
    { id: "draft", label: "Draft", color: "#38bdf8", hint: "Prepares changes for a human" },
    { id: "write", label: "Write", color: "#f59e0b", hint: "Can change records" },
    { id: "approve", label: "Approve", color: "#a855f7", hint: "Can approve others' work" },
];

export const PROVIDERS: { id: string; name: string; models: string[] }[] = [
    { id: "default", name: "Default (AI Studio settings)", models: ["default"] },
    { id: "google", name: "Google Gemini", models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"] },
    { id: "anthropic", name: "Anthropic Claude", models: ["claude-sonnet-4-5", "claude-haiku-4-5", "claude-opus-4-1"] },
    { id: "openai", name: "OpenAI", models: ["gpt-4.1", "gpt-4.1-mini", "gpt-4o-mini"] },
    { id: "groq", name: "Groq", models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"] },
    { id: "ollama", name: "Ollama (local)", models: ["llama3.1", "qwen2.5", "mistral"] },
];

export const TIER_META: Record<ModelTier, { label: string; hint: string }> = {
    small: { label: "Small · Local", hint: "Cheap, fast, simple checks" },
    medium: { label: "Medium · Fast", hint: "Everyday operations" },
    large: { label: "Large · Reasoning", hint: "Complex analysis & planning" },
};

export const EFFORT_META: Record<Effort, string> = { low: "Low", medium: "Medium", high: "High" };

export const AGENT_COLORS = [
    "#38bdf8", "#22d3ee", "#2dd4bf", "#34d399", "#84cc16", "#facc15", "#fb923c", "#f97316",
    "#f43f5e", "#ec4899", "#e879f9", "#a855f7", "#818cf8", "#60a5fa", "#94a3b8",
];

export interface AgentTemplate {
    id: string;
    name: string;
    role: string;
    color: string;
    zone: string;
    modelTier: ModelTier;
    modules: string[];
    skills: string[];
    tools: string[];
    persona: string;
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
    {
        id: "wa-cs", name: "New WA Conversations Agent", role: "WA Conversations & CS Agent", color: "#60a5fa", zone: "operations", modelTier: "medium",
        modules: ["wa-conversations", "knowledge"], skills: ["WA Shared Inbox", "CS Triage", "Reply Drafting"], tools: ["module.read", "module.draft", "kb.search", "email.draft", "activity.log"],
        persona: "You triage incoming WhatsApp customer chats, retrieve accurate answers from the Knowledge Base, and draft helpful replies for human review.",
    },
    {
        id: "partner-kasir", name: "New Partner & Kasir Agent", role: "Partner & UMKM Growth Specialist", color: "#34d399", zone: "research", modelTier: "medium",
        modules: ["partner", "wa-conversations"], skills: ["Partner Onboarding", "Store Catalog", "Kasir WA"], tools: ["module.read", "module.draft", "db.query", "report.generate", "activity.log"],
        persona: "You help UMKM partners manage their store catalog, review daily Kasir WhatsApp sales, and flag low-stock items.",
    },
    {
        id: "knowledge-curator", name: "New Knowledge Research Agent", role: "Knowledge Research Curator", color: "#14b8a6", zone: "research", modelTier: "medium",
        modules: ["knowledge", "ai-studio"], skills: ["Deep Research", "Web Scraping", "RAG Indexing"], tools: ["module.read", "module.draft", "kb.search", "kb.write", "web.search", "activity.log"],
        persona: "You research verified sources, synthesize clear FAQ and knowledge articles, and keep Studio RAG notebooks grounded and up to date.",
    },
    {
        id: "marketing-content", name: "New Marketing Content Agent", role: "Marketing Content Strategist", color: "#fb7185", zone: "research", modelTier: "large",
        modules: ["marketing", "partner"], skills: ["Copywriting", "Brochures", "Campaign Strategy"], tools: ["module.read", "module.draft", "web.search", "report.generate", "activity.log"],
        persona: "You craft engaging WhatsApp promos, social campaigns, and digital brochure copy tailored to each UMKM partner's brand voice.",
    },
    {
        id: "wa-gateway", name: "New WhatsApp Gateway Agent", role: "WhatsApp Gateway Engineer", color: "#38bdf8", zone: "engineering", modelTier: "medium",
        modules: ["whatsapp-gateway", "settings"], skills: ["WAHA Sessions", "Webhooks", "QR Pairing"], tools: ["module.read", "module.draft", "runbook.execute", "activity.log"],
        persona: "You monitor WhatsApp Gateway (WAHA) session health, webhook delivery, and connection stability across partner stores.",
    },
    {
        id: "studio-prompt", name: "New AI Studio Engineer", role: "AI Studio & Prompt Engineer", color: "#22d3ee", zone: "engineering", modelTier: "large",
        modules: ["ai-studio", "settings"], skills: ["Prompt Engineering", "RAG Evals", "LLM Providers"], tools: ["module.read", "module.draft", "kb.search", "pipeline.trigger", "activity.log"],
        persona: "You evaluate system prompts, audit RAG retrieval quality, and tune LLM model settings and token guardrails.",
    },
    {
        id: "blank", name: "New Agent", role: "AI Studio Agent", color: "#818cf8", zone: "research", modelTier: "medium",
        modules: ["ai-studio"], skills: [], tools: ["module.read", "activity.log"],
        persona: "",
    },
];

export const STATUS_COLUMNS: { id: "queued" | "running" | "awaiting_approval" | "review" | "done"; label: string; color: string; hint: string }[] = [
    { id: "queued", label: "Queued", color: "#94a3b8", hint: "Waiting for the agent" },
    { id: "running", label: "Running", color: "#38bdf8", hint: "Agent is working" },
    { id: "awaiting_approval", label: "Needs approval", color: "#f59e0b", hint: "Blocked on a human" },
    { id: "review", label: "Review", color: "#a855f7", hint: "Agent finished — you confirm" },
    { id: "done", label: "Done", color: "#22c55e", hint: "Confirmed by a human" },
];

export const PRIORITY_META: Record<string, { label: string; color: string }> = {
    low: { label: "Low", color: "#64748b" },
    normal: { label: "Normal", color: "#38bdf8" },
    high: { label: "High", color: "#f59e0b" },
    urgent: { label: "Urgent", color: "#ef4444" },
};

export function slugify(s: string) {
    return s
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
}
