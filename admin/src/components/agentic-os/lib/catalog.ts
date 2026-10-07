/**
 * Agentic OS — static catalogs: tools, model providers, agent templates.
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
    { id: "module.read", name: "Read module pages", description: "Open and read any module it has access to", risk: "read", group: "Modules" },
    { id: "module.draft", name: "Draft changes", description: "Prepare edits that a human applies", risk: "draft", group: "Modules" },
    { id: "module.write", name: "Write to modules", description: "Create / update records directly", risk: "write", group: "Modules" },
    { id: "playbook.run", name: "Run playbooks", description: "Execute assigned playbooks step by step", risk: "write", group: "Modules" },
    { id: "kb.search", name: "Search knowledge", description: "Semantic search in the knowledge base & memory map", risk: "read", group: "Knowledge" },
    { id: "kb.write", name: "Write knowledge", description: "Create KB articles and memory items", risk: "write", group: "Knowledge" },
    { id: "ticket.create", name: "Create tickets", description: "Open ITSM tickets / work orders", risk: "write", group: "Modules" },
    { id: "ticket.comment", name: "Comment on tickets", description: "Post internal notes on tickets", risk: "write", group: "Modules" },
    { id: "email.draft", name: "Draft emails", description: "Write emails into drafts — never sends", risk: "draft", group: "Communication" },
    { id: "email.send", name: "Send emails", description: "Send email on behalf of the team", risk: "send", group: "Communication" },
    { id: "chat.notify", name: "Notify team", description: "Post notifications to the team inbox", risk: "send", group: "Communication" },
    { id: "whatsapp.send", name: "WhatsApp messages", description: "Send WhatsApp messages via WAHA", risk: "send", group: "Communication" },
    { id: "report.generate", name: "Generate reports", description: "Build charts & reports", risk: "write", group: "Data" },
    { id: "db.query", name: "Query data", description: "Read-only SQL / analytics queries", risk: "read", group: "Data" },
    { id: "pipeline.trigger", name: "Trigger pipelines", description: "Start CI/CD builds & deployments", risk: "write", group: "Engineering" },
    { id: "runbook.execute", name: "Execute runbooks", description: "Run ops automation (restart, scale…)", risk: "write", group: "Engineering" },
    { id: "record.delete", name: "Delete records", description: "Remove records permanently", risk: "delete", group: "System" },
    { id: "web.search", name: "Web research", description: "Search and read public web pages", risk: "read", group: "Knowledge" },
    { id: "activity.log", name: "Activity log", description: "Write to the office activity feed", risk: "read", group: "System" },
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
        id: "service-desk", name: "New Service Desk Agent", role: "Service Desk Agent", color: "#60a5fa", zone: "operations", modelTier: "medium",
        modules: ["itsm", "knowledge"], skills: ["Triage", "SLA", "Customer empathy"], tools: ["module.read", "module.draft", "kb.search", "ticket.comment", "email.draft", "activity.log"],
        persona: "You triage incoming tickets, propose resolutions from the knowledge base and keep requesters informed. You never close a ticket without a human.",
    },
    {
        id: "devops", name: "New DevOps Agent", role: "DevOps Engineer", color: "#38bdf8", zone: "engineering", modelTier: "large",
        modules: ["devops", "infrastructure", "ops"], skills: ["CI/CD", "Docker", "Observability"], tools: ["module.read", "module.draft", "pipeline.trigger", "runbook.execute", "kb.search", "activity.log"],
        persona: "You keep pipelines green and services healthy. Before any deployment or restart you run pre-checks and you attach logs to the related incident.",
    },
    {
        id: "finance", name: "New Finance Agent", role: "Finance Analyst", color: "#facc15", zone: "research", modelTier: "medium",
        modules: ["accounting", "reports"], skills: ["Reconciliation", "Forecasting"], tools: ["module.read", "module.draft", "db.query", "report.generate", "activity.log"],
        persona: "You reconcile ledgers, flag anomalies and prepare reports. You never post journal entries without approval.",
    },
    {
        id: "security", name: "New Security Agent", role: "Security Analyst", color: "#f43f5e", zone: "engineering", modelTier: "large",
        modules: ["security", "infrastructure"], skills: ["Threat triage", "CVE analysis"], tools: ["module.read", "module.draft", "kb.search", "ticket.create", "activity.log"],
        persona: "You triage security findings by real exploitability and raise remediation tickets with clear evidence.",
    },
    {
        id: "facilities", name: "New Facilities Agent", role: "Facilities Engineer", color: "#84cc16", zone: "engineering", modelTier: "small",
        modules: ["bms", "dcim", "scada"], skills: ["HVAC", "Energy", "Alarms"], tools: ["module.read", "module.draft", "ticket.create", "activity.log"],
        persona: "You watch building and data-center telemetry, acknowledge alarms and open work orders for field technicians.",
    },
    {
        id: "sales", name: "New Sales Agent", role: "Sales & Market Analyst", color: "#fb7185", zone: "research", modelTier: "medium",
        modules: ["crm", "news"], skills: ["Lead scoring", "Market research"], tools: ["module.read", "module.draft", "web.search", "email.draft", "activity.log"],
        persona: "You enrich and score leads, watch competitors and draft follow-ups for the sales team to send.",
    },
    {
        id: "blank", name: "New Agent", role: "AI Agent", color: "#818cf8", zone: "research", modelTier: "medium",
        modules: ["reports"], skills: [], tools: ["module.read", "activity.log"],
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
