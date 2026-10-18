/**
 * Catalog of existing Nusantarasoft modules that AI agents operate in.
 * Every agent task points at a real admin route so the user can "look over the
 * agent's shoulder" in the actual module page.
 */

export type ModuleId =
    | "itsm"
    | "knowledge"
    | "command-center"
    | "ops"
    | "devops"
    | "infrastructure"
    | "security"
    | "dcim"
    | "bms"
    | "scada"
    | "pm"
    | "hr"
    | "reports"
    | "accounting"
    | "crm"
    | "news"
    | "ai-studio"
    | "inventory";

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
    itsm: {
        id: "itsm", name: "ITSM", route: "/admin/ai-studio", color: "#38bdf8",
        keywords: ["ticket", "incident", "inc-", "service request", "sla", "itsm", "helpdesk", "change request"],
        steps: ["Open the ticket queue", "Read ticket details & history", "Check related CMDB items", "Draft a resolution", "Update ticket status"],
    },
    knowledge: {
        id: "knowledge", name: "Knowledge Base", route: "/admin/ai-studio/riset-knowledge", color: "#2dd4bf",
        keywords: ["kb", "knowledge", "article", "faq", "documentation", "docs"],
        steps: ["Search existing articles", "Collect source notes", "Draft the article", "Tag & submit for review"],
    },
    "command-center": {
        id: "command-center", name: "Command Center", route: "/admin/agentic-os", color: "#818cf8",
        keywords: ["command center", "situation", "overview", "war room", "status report", "briefing"],
        steps: ["Open the Command Center", "Scan critical alerts", "Compare KPIs against baseline", "Publish a summary"],
    },
    ops: {
        id: "ops", name: "Ops Runbooks", route: "/admin/agentic-os", color: "#f97316",
        keywords: ["runbook", "playbook", "restart", "remediate", "ops run"],
        steps: ["Select the playbook", "Run pre-checks", "Execute the playbook", "Verify health checks", "Attach run log"],
    },
    devops: {
        id: "devops", name: "DevOps", route: "/admin/agentic-os", color: "#84cc16",
        keywords: ["deploy", "pipeline", "build", "docker", "ci", "release", "container", "test"],
        steps: ["Open the pipeline", "Trigger the build", "Watch build stages", "Run smoke tests", "Promote the artifact"],
    },
    infrastructure: {
        id: "infrastructure", name: "Infrastructure", route: "/admin/ai-studio/ai-gateway", color: "#22d3ee",
        keywords: ["kong", "5xx", "latency", "server", "prometheus", "grafana", "gateway", "uptime", "infra"],
        steps: ["Open monitoring dashboards", "Correlate metrics & logs", "Identify the root cause", "Apply the fix", "Confirm recovery"],
    },
    security: {
        id: "security", name: "Security", route: "/admin/ai-studio/settings", color: "#f43f5e",
        keywords: ["security", "cve", "vulnerab", "pentest", "audit trail", "login", "keycloak", "threat"],
        steps: ["Load the latest scan", "Triage findings by severity", "Verify exploitability", "Raise remediation tickets"],
    },
    dcim: {
        id: "dcim", name: "DCIM", route: "/admin/virtual-office", color: "#a3e635",
        keywords: ["rack", "dcim", "capacity", "pdu", "data center", "datacenter"],
        steps: ["Open capacity view", "Check power & cooling headroom", "Simulate placement", "Propose a plan"],
    },
    bms: {
        id: "bms", name: "BMS", route: "/admin/virtual-office", color: "#facc15",
        keywords: ["energy", "hvac", "building", "bms", "lighting", "elevator", "cctv"],
        steps: ["Open building dashboard", "Analyse consumption trends", "Adjust setpoints & schedules", "Log the change"],
    },
    scada: {
        id: "scada", name: "SCADA", route: "/admin/virtual-office", color: "#fb923c",
        keywords: ["scada", "alarm", "sensor", "plc", "pump", "hmi"],
        steps: ["Open active alarms", "Check sensor trends", "Acknowledge & annotate", "Dispatch field work order"],
    },
    pm: {
        id: "pm", name: "Projects", route: "/admin/agentic-os", color: "#e879f9",
        keywords: ["sprint", "project", "backlog", "board", "roadmap", "milestone", "task"],
        steps: ["Open the project board", "Review card status", "Re-prioritise the backlog", "Notify assignees"],
    },
    hr: {
        id: "hr", name: "HR", route: "/admin/agentic-os", color: "#f472b6",
        keywords: ["candidate", "employee", "leave", "payroll", "recruit", "onboarding", "hr"],
        steps: ["Open the HR pipeline", "Review profiles", "Score against criteria", "Schedule next steps"],
    },
    reports: {
        id: "reports", name: "Reports", route: "/admin/ai-studio", color: "#60a5fa",
        keywords: ["report", "chart", "kpi", "dashboard", "executive", "analy"],
        steps: ["Open the report builder", "Query the data sources", "Build charts", "Write insights", "Schedule delivery"],
    },
    accounting: {
        id: "accounting", name: "Accounting", route: "/admin/ai-studio/partner", color: "#34d399",
        keywords: ["invoice", "ledger", "reconcil", "revenue", "budget", "payable", "receivable", "journal"],
        steps: ["Open the ledger", "Match transactions", "Flag discrepancies", "Post adjusting entries"],
    },
    crm: {
        id: "crm", name: "CRM", route: "/admin/ai-studio/partner", color: "#c084fc",
        keywords: ["deal", "lead", "crm", "customer", "quote", "opportunit", "account"],
        steps: ["Open the sales pipeline", "Enrich lead data", "Score & prioritise", "Draft follow-ups"],
    },
    news: {
        id: "news", name: "News Intel", route: "/admin/ai-studio/riset-knowledge", color: "#fda4af",
        keywords: ["news", "market", "sentiment", "competitor", "trend", "research"],
        steps: ["Crawl latest sources", "Cluster topics", "Score sentiment", "Write the brief"],
    },
    "ai-studio": {
        id: "ai-studio", name: "AI Studio", route: "/admin/ai-studio", color: "#a78bfa",
        keywords: ["prompt", "model", "ai studio", "embedding", "knowledge graph", "eval", "agent"],
        steps: ["Open AI Studio", "Load the dataset", "Run evaluations", "Compare results", "Save the best config"],
    },
    inventory: {
        id: "inventory", name: "Inventory", route: "/admin/ai-studio/partner", color: "#fbbf24",
        keywords: ["stock", "inventory", "warehouse", "spare part", "item", "procure"],
        steps: ["Open stock levels", "Find items below reorder point", "Draft purchase requests", "Notify procurement"],
    },
};

export interface TaskTemplate {
    moduleId: ModuleId;
    route: string;
    title: string;
    steps: string[];
}

/** Realistic task scripts per module. Agents pick from the modules they own. */
export const TASK_TEMPLATES: TaskTemplate[] = [
    // ITSM
    { moduleId: "itsm", route: "/admin/ai-studio", title: "Resolve INC-2041 (login loop)", steps: ["Open INC-2041 in the queue", "Review the user's session logs", "Link to known problem PRB-118", "Post workaround to requester", "Set status to Resolved"] },
    { moduleId: "itsm", route: "/admin/ai-studio", title: "Triage 6 new service requests", steps: ["Filter unassigned requests", "Categorise by service", "Set priority from SLA matrix", "Assign resolver groups", "Notify requesters"] },
    { moduleId: "itsm", route: "/admin/ai-studio", title: "Check SLA breaches for today", steps: ["Open the SLA monitor", "Find tickets at risk", "Escalate 2 breaching tickets", "Log escalation notes"] },
    { moduleId: "itsm", route: "/admin/ai-studio", title: "Root-cause analysis for PRB-118", steps: ["Open PRB-118", "Group linked incidents", "Identify the common cause", "Propose a permanent fix"] },
    // Knowledge
    { moduleId: "knowledge", route: "/admin/ai-studio/riset-knowledge", title: "Draft KB article from INC-2041", steps: ["Collect resolution notes", "Draft the article", "Add screenshots & tags", "Submit for review"] },
    // Command Center
    { moduleId: "command-center", route: "/admin/agentic-os", title: "Morning situation report", steps: ["Open the Command Center", "Scan critical alerts", "Compare KPIs vs yesterday", "Publish summary to the team"] },
    { moduleId: "command-center", route: "/admin/agentic-os", title: "Investigate red KPI: API latency", steps: ["Drill into the latency tile", "Correlate with deployments", "Ping the on-call agent", "Annotate the KPI"] },
    // Ops
    { moduleId: "ops", route: "/admin/agentic-os", title: "Run 'restart-kong' playbook", steps: ["Select playbook restart-kong", "Run pre-checks", "Execute the playbook", "Verify health checks", "Attach run log to incident"] },
    { moduleId: "ops", route: "/admin/agentic-os", title: "Nightly system health review", steps: ["Open system health", "Check failed jobs", "Re-run 2 failed schedules", "Record findings"] },
    // DevOps
    { moduleId: "devops", route: "/admin/agentic-os", title: "Rebuild admin container & smoke test", steps: ["Trigger the admin pipeline", "Watch build stages", "Run smoke tests", "Promote to staging"] },
    { moduleId: "devops", route: "/admin/agentic-os", title: "Fix failing test stage in pipeline #812", steps: ["Open pipeline #812", "Read the failing job log", "Patch the flaky test", "Re-run the pipeline"] },
    { moduleId: "devops", route: "/admin/agentic-os", title: "Roll out release 3.8 to staging", steps: ["Open deployments", "Review the release diff", "Deploy to staging", "Verify canary metrics"] },
    // Infrastructure
    { moduleId: "infrastructure", route: "/admin/ai-studio/ai-gateway", title: "Investigate 5xx spike on Kong", steps: ["Open API gateway metrics", "Filter 5xx by route", "Inspect upstream health", "Raise rate limit on /graphql", "Confirm recovery"] },
    { moduleId: "infrastructure", route: "/admin/ai-studio/ai-gateway", title: "Tune Prometheus alert thresholds", steps: ["Open alert rules", "Review noisy alerts", "Adjust thresholds", "Reload configuration"] },
    // Security
    { moduleId: "security", route: "/admin/ai-studio/settings", title: "Dependency audit — 2 critical CVEs", steps: ["Load the latest scan", "Triage findings by severity", "Verify exploitability", "Raise remediation tickets"] },
    { moduleId: "security", route: "/admin/ai-studio/settings", title: "Review privileged logins this week", steps: ["Open the audit trail", "Filter admin sessions", "Flag unusual locations", "Notify the security lead"] },
    // DCIM
    { moduleId: "dcim", route: "/admin/virtual-office", title: "Plan capacity for 4 new racks", steps: ["Open capacity planner", "Check power headroom", "Check cooling headroom", "Propose rack positions"] },
    { moduleId: "dcim", route: "/admin/virtual-office", title: "Audit power usage on PDU row B", steps: ["Open power view", "Compare PDU loads", "Flag overloaded circuits", "Suggest rebalancing"] },
    // BMS
    { moduleId: "bms", route: "/admin/virtual-office", title: "Optimise HVAC schedule for the weekend", steps: ["Open HVAC zones", "Review occupancy forecast", "Adjust setpoints", "Publish schedule"] },
    { moduleId: "bms", route: "/admin/virtual-office", title: "Investigate energy spike in Tower A", steps: ["Open energy dashboard", "Drill into Tower A", "Find the anomalous meter", "Create a work order"] },
    // SCADA
    { moduleId: "scada", route: "/admin/virtual-office", title: "Acknowledge pump station alarms", steps: ["Open active alarms", "Check pressure trends", "Acknowledge & annotate", "Dispatch field technician"] },
    // PM
    { moduleId: "pm", route: "/admin/agentic-os", title: "Groom sprint 24 backlog", steps: ["Open the backlog", "Split oversized stories", "Estimate with history", "Re-order by priority"] },
    { moduleId: "pm", route: "/admin/agentic-os", title: "Update roadmap for AI Studio", steps: ["Open the roadmap", "Move slipped milestones", "Add dependency links", "Share with stakeholders"] },
    // HR
    { moduleId: "hr", route: "/admin/agentic-os", title: "Screen 12 applicants for DevOps role", steps: ["Open the requisition", "Parse CVs", "Score against criteria", "Shortlist top 4"] },
    // Reports
    { moduleId: "reports", route: "/admin/ai-studio", title: "Build Q3 executive report", steps: ["Open executive reports", "Pull revenue & SLA data", "Build charts", "Write highlights", "Schedule delivery"] },
    // Accounting
    { moduleId: "accounting", route: "/admin/ai-studio/partner", title: "Reconcile September bank statements", steps: ["Import bank statement", "Auto-match transactions", "Review 9 unmatched items", "Post adjustments"] },
    { moduleId: "accounting", route: "/admin/ai-studio/partner", title: "Flag overdue receivables", steps: ["Open receivables aging", "Filter > 60 days", "Draft reminder emails", "Update collection notes"] },
    // CRM
    { moduleId: "crm", route: "/admin/ai-studio/partner", title: "Score new leads in the pipeline", steps: ["Open the pipeline", "Enrich company data", "Score fit & intent", "Assign owners"] },
    { moduleId: "crm", route: "/admin/ai-studio/partner", title: "Prepare quote for PT Maju Jaya", steps: ["Open quotes", "Select product bundle", "Apply volume discount", "Send for approval"] },
    // News
    { moduleId: "news", route: "/admin/ai-studio/riset-knowledge", title: "Competitive scan: CMS platforms in SEA", steps: ["Crawl latest sources", "Cluster competitor news", "Score sentiment", "Write the brief"] },
    // AI Studio
    { moduleId: "ai-studio", route: "/admin/ai-studio", title: "Evaluate prompts for the support bot", steps: ["Open AI Studio", "Load 50 test questions", "Run A/B prompts", "Save the winning prompt"] },
    { moduleId: "ai-studio", route: "/admin/ai-studio", title: "Re-index the knowledge graph", steps: ["Open AI Studio", "Detect stale nodes", "Re-embed documents", "Validate relations"] },
    // Inventory
    { moduleId: "inventory", route: "/admin/ai-studio/partner", title: "Reorder low-stock spare parts", steps: ["Open stock levels", "Find items below reorder point", "Draft purchase requests", "Notify procurement"] },
];

export function templatesFor(moduleIds: ModuleId[]): TaskTemplate[] {
    return TASK_TEMPLATES.filter((t) => moduleIds.includes(t.moduleId));
}

export function findTemplate(title: string): TaskTemplate {
    const t = TASK_TEMPLATES.find((x) => x.title === title);
    if (!t) throw new Error(`Unknown task template: ${title}`);
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
