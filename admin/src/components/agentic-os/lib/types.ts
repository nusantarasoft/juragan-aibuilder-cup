/**
 * Agentic OS — client types (mirror the middleware GraphQL contract).
 * MAPS: Memory · Agent · Pulse · Screen.
 */

export type AgentRunStatus = "active" | "paused" | "offline";
export type ModelTier = "small" | "medium" | "large";
export type Effort = "low" | "medium" | "high";
export type Runner = "cloud" | "browser";
export type Permission = "none" | "read" | "draft" | "write" | "approve";
export type Priority = "low" | "normal" | "high" | "urgent";
export type TaskStatus = "queued" | "running" | "awaiting_approval" | "review" | "done" | "failed" | "cancelled";
export type TaskSource = "manual" | "dispatch" | "routine" | "workflow" | "autopilot" | "seed";

export interface Guardrails {
    denySend?: boolean;
    denyShare?: boolean;
    denyDelete?: boolean;
    requireApproval?: string[];
    maxStepsPerTask?: number;
    workingHours?: { start: string; end: string } | null;
}

export interface OsAgent {
    id: string;
    slug: string;
    name: string;
    role: string;
    description: string;
    persona: string;
    systemPrompt: string;
    provider: string;
    model: string;
    modelTier: ModelTier;
    temperature: number;
    effort: Effort;
    color: string;
    avatar: Record<string, unknown> | null;
    zone: string;
    deskId: string | null;
    modules: string[];
    skills: string[];
    tools: string[];
    permissions: Record<string, Permission> | null;
    guardrails: Guardrails | null;
    memoryScope: string[];
    runner: Runner;
    dailyTokenBudget: number;
    dailyRunBudget: number;
    status: AgentRunStatus;
    version: number;
    stats: { tasksCompleted?: number; successRate?: number; avgLatencyMs?: number; tokensToday?: number } | null;
    createdBy: string | null;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export type OsAgentInput = Partial<Omit<OsAgent, "id" | "version" | "createdBy" | "archivedAt" | "createdAt" | "updatedAt">>;

export interface OsAgentVersion {
    id: string;
    agentId: string;
    version: number;
    snapshot: Record<string, unknown>;
    changeNote: string | null;
    changedBy: string | null;
    createdAt: string;
}

export interface OsPlaybook {
    id: string;
    agentId: string | null;
    moduleId: string;
    route: string;
    title: string;
    description: string;
    steps: string[];
    priority: Priority;
    estimatedMinutes: number;
    requiresApproval: boolean;
    enabled: boolean;
    sortOrder: number;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export type OsPlaybookInput = Partial<Omit<OsPlaybook, "id" | "archivedAt" | "createdAt" | "updatedAt">>;

export interface OsTask {
    id: string;
    agentId: string | null;
    playbookId: string | null;
    routineId: string | null;
    workflowId: string | null;
    title: string;
    description: string;
    moduleId: string;
    route: string;
    steps: string[];
    status: TaskStatus;
    progress: number;
    priority: Priority;
    sortOrder: number;
    source: TaskSource;
    requiresApproval: boolean;
    dueAt: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    completedAt: string | null;
    completedBy: string | null;
    result: string | null;
    error: string | null;
    requestedBy: string | null;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
    /** Phase 4: the goal this task contributes to. Optional so the core snapshot never depends on it. */
    goalId?: string | null;
}

export type OsTaskInput = Partial<
    Pick<OsTask, "agentId" | "playbookId" | "title" | "description" | "moduleId" | "route" | "steps" | "status" | "priority" | "sortOrder" | "source" | "requiresApproval" | "dueAt" | "goalId">
>;

export interface OsApproval {
    id: string;
    taskId: string | null;
    agentId: string | null;
    action: string;
    summary: string;
    payload: Record<string, unknown> | null;
    status: "pending" | "approved" | "rejected";
    requestedAt: string;
    decidedBy: string | null;
    decidedAt: string | null;
    comment: string | null;
    /** Phase 2: set for Pulse delivery approvals (no task). Optional so the Phase 1 snapshot query stays valid. */
    runId?: string | null;
    routineId?: string | null;
}

export interface OsAuditEntry {
    id: string;
    actorType: "user" | "agent" | "system";
    actorId: string | null;
    action: string;
    entity: string;
    entityId: string | null;
    summary: string;
    level: "info" | "success" | "warning" | "error";
    moduleId: string | null;
    route: string | null;
    createdAt: string;
}

export interface OsSettings {
    tenantId: string;
    dailyRunCeiling: number;
    rollingWindowMinutes: number;
    rollingWindowCeiling: number;
    monthlyTokenBudget: number;
    killSwitch: boolean;
    autopilot: boolean;
    autopilotReviewCap: number;
    stepSeconds: number;
    defaultRunner: Runner;
    defaultProvider: string | null;
    defaultModel: string | null;
    requireApprovalFor: string[];
    updatedAt: string | null;
}

export type OsSettingsInput = Partial<Omit<OsSettings, "tenantId" | "updatedAt">> & Partial<OsPulseSettings>;

export interface OsStats {
    totalAgents: number;
    activeAgents: number;
    queuedTasks: number;
    runningTasks: number;
    reviewTasks: number;
    awaitingApproval: number;
    doneToday: number;
    failedToday: number;
    runsToday: number;
    tokensToday: number;
    costToday: number;
    pendingApprovals: number;
}

/* ------------------------------------------------------------------ */
/* Phase 2 — Pulse (P) + Governance                                    */
/* ------------------------------------------------------------------ */

export type LlmMode = "live" | "dry_run";
export type RoutineKind = "prompt" | "playbook" | "check" | "workflow";
export type OutputTarget = "activity" | "notification" | "memory" | "task";
export type RunStatus = "running" | "success" | "failed" | "blocked" | "timeout";
export type RunTrigger = "schedule" | "manual" | "queue" | "dispatch" | "workflow" | "autopilot";

/** Pulse-only settings (fetched separately so the core snapshot never depends on Phase 2). */
export interface OsPulseSettings {
    llmMode: LlmMode;
    pulseEnabled: boolean;
    runCostCeilingUsd: number;
}

export interface OsRoutine {
    id: string;
    name: string;
    description: string;
    agentId: string | null;
    cron: string;
    timezone: string;
    runner: Runner;
    kind: RoutineKind;
    playbookId: string | null;
    /** Phase 3: routine kind `workflow` starts this workflow. */
    workflowId?: string | null;
    prompt: string;
    model: string | null;
    effort: Effort;
    allowedTools: string[];
    maxTurns: number;
    timeoutSeconds: number;
    outputTarget: OutputTarget;
    enabled: boolean;
    lastRunAt: string | null;
    nextRunAt: string | null;
    lastStatus: RunStatus | null;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export type OsRoutineInput = Partial<Omit<OsRoutine, "id" | "lastRunAt" | "lastStatus" | "archivedAt" | "createdAt" | "updatedAt">>;

export interface OsRun {
    id: string;
    routineId: string | null;
    taskId: string | null;
    agentId: string | null;
    trigger: RunTrigger;
    provider: string | null;
    model: string | null;
    turns: number;
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
    durationMs: number | null;
    status: RunStatus;
    output: string | null;
    error: string | null;
    startedAt: string;
    finishedAt: string | null;
    routineName: string | null;
    kind: string | null;
    outputTarget: string | null;
    prompt: string | null;
    blockedReason: string | null;
    approvalId: string | null;
    requestedBy: string | null;
}

export interface OsRunQueueItem {
    id: string;
    routineId: string;
    requestedBy: string | null;
    requestedAt: string;
    pickedAt: string | null;
    runId: string | null;
}

export interface OsCapUsage {
    used: number;
    limit: number;
    pct: number;
}

export interface OsNextRun {
    routineId: string;
    name: string;
    agentId: string | null;
    nextRunAt: string;
    cron: string;
    kind: RoutineKind;
}

export interface OsPulseStatus {
    now: string;
    lastTickAt: string | null;
    pulseEnabled: boolean;
    killSwitch: boolean;
    llmMode: LlmMode;
    provider: string | null;
    model: string | null;
    providerReady: boolean;
    dailyRuns: OsCapUsage;
    rollingRuns: OsCapUsage;
    monthlyTokens: OsCapUsage;
    dailyCost: OsCapUsage;
    runsToday: number;
    successToday: number;
    failedToday: number;
    blockedToday: number;
    queueDepth: number;
    nextRuns: OsNextRun[];
}

export interface OsCronPreview {
    valid: boolean;
    error: string | null;
    next: string[];
}

/* ------------------------------------------------------------------ */
/* Phase 3 — Memory Map (M) · Workflows · Screen (S)                   */
/* ------------------------------------------------------------------ */

export type MemorySection = "projects" | "state" | "skills" | "memory" | "routines" | "not_here";
export type MemoryKind = "page" | "doc" | "kb" | "note" | "fact" | "skill" | "link";
export type MemoryHealth = "ok" | "stale" | "broken" | "unknown";

export interface OsMemoryArea {
    id: string;
    slug: string;
    name: string;
    description: string;
    color: string;
    ownerAgentId: string | null;
    sortOrder: number;
    itemCount: number;
    archivedAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
}

export type OsMemoryAreaInput = Partial<Pick<OsMemoryArea, "slug" | "name" | "description" | "color" | "ownerAgentId" | "sortOrder">>;

export interface OsMemoryItem {
    id: string;
    areaId: string;
    section: MemorySection;
    kind: MemoryKind;
    title: string;
    path: string | null;
    note: string;
    content: string;
    tags: string[];
    pinned: boolean;
    agentIds: string[];
    health: MemoryHealth;
    lastVerifiedAt: string | null;
    archivedAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
}

export type OsMemoryItemInput = Partial<
    Pick<OsMemoryItem, "areaId" | "section" | "kind" | "title" | "path" | "note" | "content" | "tags" | "pinned" | "agentIds" | "health" | "lastVerifiedAt">
>;

export type WorkflowTrigger = "manual" | "routine" | "event";
export type WfNodeType = "start" | "agent" | "gate" | "end";

export interface WfAgentData {
    agentId: string;
    playbookId: string | null;
    title: string;
    description: string;
    moduleId: string;
    steps: string[];
    priority: Priority;
    waitFor: "review" | "done";
    [k: string]: unknown;
}

export interface WfLabelData {
    label: string;
    [k: string]: unknown;
}

export interface WfNode {
    id: string;
    type: WfNodeType;
    position: { x: number; y: number };
    data: WfAgentData | WfLabelData;
}

export interface WfEdge {
    id: string;
    source: string;
    target: string;
}

export interface WfGraph {
    nodes: WfNode[];
    edges: WfEdge[];
}

export interface OsWorkflow {
    id: string;
    name: string;
    description: string;
    trigger: WorkflowTrigger;
    graph: WfGraph | Record<string, unknown> | null;
    enabled: boolean;
    lastRunAt?: string | null;
    lastStatus?: string | null;
    archivedAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
}

export type OsWorkflowInput = Partial<Pick<OsWorkflow, "name" | "description" | "trigger" | "enabled">> & { graph?: WfGraph };

export type WfRunStatus = "running" | "waiting_approval" | "success" | "failed" | "cancelled";
export type WfNodeStatus = "pending" | "active" | "done" | "failed" | "cancelled" | "skipped";

export interface WfNodeState {
    status: WfNodeStatus;
    taskId?: string;
    approvalId?: string;
    output?: string | null;
    startedAt?: string;
    finishedAt?: string;
    error?: string;
}

export interface OsWorkflowRun {
    id: string;
    workflowId: string;
    workflowName: string;
    status: WfRunStatus;
    trigger: WorkflowTrigger;
    nodeStates: Record<string, WfNodeState>;
    graphSnapshot: WfGraph | Record<string, unknown>;
    routineId: string | null;
    startedBy: string | null;
    startedAt: string;
    finishedAt: string | null;
    error: string | null;
}

/* ------------------------------------------------------------------ */
/* Phase 4 — Command Deck · Goals & gate reviews                       */
/* ------------------------------------------------------------------ */

export type GoalStatus = "active" | "at_risk" | "paused" | "achieved" | "missed";
export type GoalVerdict = "on_track" | "at_risk" | "off_track" | "achieved" | "missed";

export interface OsGoal {
    id: string;
    title: string;
    description: string;
    areaId: string | null;
    ownerAgentId: string | null;
    metric: string;
    targetValue: number | null;
    currentValue: number | null;
    unit: string;
    windowDays: number;
    /** `YYYY-MM-DD` */
    startsOn: string;
    /** `YYYY-MM-DD` */
    gateOn: string;
    status: GoalStatus;
    progress: number;
    nextAction: string;
    nextActionDue: string | null;
    color: string;
    sortOrder: number;
    createdBy: string | null;
    archivedAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    reviewCount: number;
    lastReviewedAt: string | null;
    lastVerdict: GoalVerdict | null;
    openTasks: number;
    doneTasks: number;
}

export type OsGoalInput = Partial<
    Pick<
        OsGoal,
        | "title"
        | "description"
        | "areaId"
        | "ownerAgentId"
        | "metric"
        | "targetValue"
        | "currentValue"
        | "unit"
        | "windowDays"
        | "startsOn"
        | "gateOn"
        | "status"
        | "progress"
        | "nextAction"
        | "nextActionDue"
        | "color"
        | "sortOrder"
    >
>;

export interface OsGoalReview {
    id: string;
    goalId: string;
    verdict: GoalVerdict;
    progress: number | null;
    currentValue: number | null;
    note: string;
    nextAction: string | null;
    nextGateOn: string | null;
    reviewedBy: string | null;
    createdAt: string;
}

export interface OsGoalReviewInput {
    goalId: string;
    verdict: GoalVerdict;
    progress?: number | null;
    currentValue?: number | null;
    note?: string;
    nextAction?: string | null;
    nextGateOn?: string | null;
}

export interface OsDayStats {
    date: string;
    runs: number;
    success: number;
    failed: number;
    blocked: number;
    costUsd: number;
    tokens: number;
}

export interface OsWeekStats {
    weekStart: string;
    tasksCreated: number;
    tasksDone: number;
    reviewsWaiting: number;
    approvalsDecided: number;
    approvalsTotal: number;
    notesAdded: number;
    runs: number;
    overdueTasks: number;
}

export interface OsWeekActivity {
    weekStart: string;
    tasksDone: number;
    runs: number;
    approvals: number;
    notes: number;
    score: number;
}

export interface OsDeckStats {
    now: string;
    timezone: string;
    today: OsDayStats;
    yesterday: OsDayStats;
    week: OsWeekStats;
    weeks: OsWeekActivity[];
}

/** Read-only live metrics for AI Studio UMKM Kasir (first recruited employee). */
export interface OsKasirLiveSnapshot {
    available: boolean;
    tenantId: string;
    slug: string;
    name: string;
    role: string;
    source: string;
    unavailableReason: string | null;
    waChatsToday: number | null;
    transactionsToday: number | null;
    lastActivityAt: string | null;
    waOnline: boolean | null;
}

export type AgentRosterKind = "live" | "demo";
