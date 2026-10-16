import { Field, Float, InputType, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

export const AOS_DEFAULT_TENANT = '00000000-0000-0000-0000-000000000010';

type Json = Record<string, unknown> | unknown[] | null;

// ════════════════════════════════════════════════════════════════════════════
// Object types
// ════════════════════════════════════════════════════════════════════════════

@ObjectType()
export class AosAgent {
    @Field() id: string;
    @Field() slug: string;
    @Field() name: string;
    @Field() role: string;
    @Field() description: string;
    @Field() persona: string;
    @Field() systemPrompt: string;
    @Field() provider: string;
    @Field() model: string;
    @Field() modelTier: string;
    @Field(() => Float) temperature: number;
    @Field() effort: string;
    @Field() color: string;
    @Field(() => GraphQLJSON) avatar: Json;
    @Field() zone: string;
    @Field(() => String, { nullable: true }) deskId: string | null;
    @Field(() => [String]) modules: string[];
    @Field(() => [String]) skills: string[];
    @Field(() => [String]) tools: string[];
    @Field(() => GraphQLJSON) permissions: Json;
    @Field(() => GraphQLJSON) guardrails: Json;
    @Field(() => [String]) memoryScope: string[];
    @Field() runner: string;
    @Field(() => Int) dailyTokenBudget: number;
    @Field(() => Int) dailyRunBudget: number;
    @Field() status: string;
    @Field(() => Int) version: number;
    @Field(() => GraphQLJSON) stats: Json;
    @Field(() => String, { nullable: true }) createdBy: string | null;
    @Field(() => String, { nullable: true }) archivedAt: string | null;
    @Field(() => String, { nullable: true }) createdAt: string | null;
    @Field(() => String, { nullable: true }) updatedAt: string | null;
}

@ObjectType()
export class AosAgentVersion {
    @Field() id: string;
    @Field() agentId: string;
    @Field(() => Int) version: number;
    @Field(() => GraphQLJSON) snapshot: Json;
    @Field(() => String, { nullable: true }) changeNote: string | null;
    @Field(() => String, { nullable: true }) changedBy: string | null;
    @Field(() => String, { nullable: true }) createdAt: string | null;
}

@ObjectType()
export class AosPlaybook {
    @Field() id: string;
    @Field(() => String, { nullable: true }) agentId: string | null;
    @Field() moduleId: string;
    @Field() route: string;
    @Field() title: string;
    @Field() description: string;
    @Field(() => [String]) steps: string[];
    @Field() priority: string;
    @Field(() => Int) estimatedMinutes: number;
    @Field() requiresApproval: boolean;
    @Field() enabled: boolean;
    @Field(() => Int) sortOrder: number;
    @Field(() => String, { nullable: true }) archivedAt: string | null;
    @Field(() => String, { nullable: true }) createdAt: string | null;
    @Field(() => String, { nullable: true }) updatedAt: string | null;
}

@ObjectType()
export class AosTask {
    @Field() id: string;
    @Field(() => String, { nullable: true }) agentId: string | null;
    @Field(() => String, { nullable: true }) playbookId: string | null;
    @Field(() => String, { nullable: true }) routineId: string | null;
    @Field(() => String, { nullable: true }) workflowId: string | null;
    @Field() title: string;
    @Field() description: string;
    @Field() moduleId: string;
    @Field() route: string;
    @Field(() => [String]) steps: string[];
    @Field() status: string;
    @Field(() => Float) progress: number;
    @Field() priority: string;
    @Field(() => Int) sortOrder: number;
    @Field() source: string;
    @Field() requiresApproval: boolean;
    @Field(() => String, { nullable: true }) dueAt: string | null;
    @Field(() => String, { nullable: true }) startedAt: string | null;
    @Field(() => String, { nullable: true }) finishedAt: string | null;
    @Field(() => String, { nullable: true }) completedAt: string | null;
    @Field(() => String, { nullable: true }) completedBy: string | null;
    @Field(() => String, { nullable: true }) result: string | null;
    @Field(() => String, { nullable: true }) error: string | null;
    @Field(() => String, { nullable: true }) requestedBy: string | null;
    @Field(() => String, { nullable: true }) archivedAt: string | null;
    @Field(() => String, { nullable: true }) createdAt: string | null;
    @Field(() => String, { nullable: true }) updatedAt: string | null;
    // Phase 3 (Workflows)
    @Field(() => String, { nullable: true }) workflowRunId: string | null;
    @Field(() => String, { nullable: true }) nodeId: string | null;
    // Phase 4 (Goals)
    @Field(() => String, { nullable: true }) goalId: string | null;
}

@ObjectType()
export class AosMemoryArea {
    @Field() id: string;
    @Field() slug: string;
    @Field() name: string;
    @Field() description: string;
    @Field() color: string;
    @Field(() => String, { nullable: true }) ownerAgentId: string | null;
    @Field(() => Int) sortOrder: number;
    @Field(() => Int) itemCount: number;
    @Field(() => String, { nullable: true }) archivedAt: string | null;
    @Field(() => String, { nullable: true }) createdAt: string | null;
    @Field(() => String, { nullable: true }) updatedAt: string | null;
}

@ObjectType()
export class AosMemoryItem {
    @Field() id: string;
    @Field() areaId: string;
    @Field() section: string;
    @Field() kind: string;
    @Field() title: string;
    @Field(() => String, { nullable: true }) path: string | null;
    @Field() note: string;
    @Field() content: string;
    @Field(() => [String]) tags: string[];
    @Field() pinned: boolean;
    @Field(() => [String]) agentIds: string[];
    @Field() health: string;
    @Field(() => String, { nullable: true }) lastVerifiedAt: string | null;
    @Field(() => String, { nullable: true }) archivedAt: string | null;
    @Field(() => String, { nullable: true }) createdAt: string | null;
    @Field(() => String, { nullable: true }) updatedAt: string | null;
}

@ObjectType()
export class AosRoutine {
    @Field() id: string;
    @Field() name: string;
    @Field() description: string;
    @Field(() => String, { nullable: true }) agentId: string | null;
    @Field() cron: string;
    @Field() timezone: string;
    @Field() runner: string;
    @Field() kind: string;
    @Field(() => String, { nullable: true }) playbookId: string | null;
    @Field() prompt: string;
    @Field(() => String, { nullable: true }) model: string | null;
    @Field() effort: string;
    @Field(() => [String]) allowedTools: string[];
    @Field(() => Int) maxTurns: number;
    @Field(() => Int) timeoutSeconds: number;
    @Field() outputTarget: string;
    @Field() enabled: boolean;
    @Field(() => String, { nullable: true }) lastRunAt: string | null;
    @Field(() => String, { nullable: true }) nextRunAt: string | null;
    @Field(() => String, { nullable: true }) lastStatus: string | null;
    @Field(() => String, { nullable: true }) archivedAt: string | null;
    @Field(() => String, { nullable: true }) createdAt: string | null;
    @Field(() => String, { nullable: true }) updatedAt: string | null;
    // Phase 3 (Workflows)
    @Field(() => String, { nullable: true }) workflowId: string | null;
}

@ObjectType()
export class AosRun {
    @Field() id: string;
    @Field(() => String, { nullable: true }) routineId: string | null;
    @Field(() => String, { nullable: true }) taskId: string | null;
    @Field(() => String, { nullable: true }) agentId: string | null;
    @Field() trigger: string;
    @Field(() => String, { nullable: true }) provider: string | null;
    @Field(() => String, { nullable: true }) model: string | null;
    @Field(() => Int) turns: number;
    @Field(() => Int) tokensIn: number;
    @Field(() => Int) tokensOut: number;
    @Field(() => Float) costUsd: number;
    @Field(() => Int, { nullable: true }) durationMs: number | null;
    @Field() status: string;
    @Field(() => String, { nullable: true }) output: string | null;
    @Field(() => String, { nullable: true }) error: string | null;
    @Field(() => String, { nullable: true }) startedAt: string | null;
    @Field(() => String, { nullable: true }) finishedAt: string | null;
    // Phase 2 (Pulse)
    @Field(() => String, { nullable: true }) routineName: string | null;
    @Field(() => String, { nullable: true }) kind: string | null;
    @Field(() => String, { nullable: true }) outputTarget: string | null;
    @Field(() => String, { nullable: true }) prompt: string | null;
    @Field(() => String, { nullable: true }) blockedReason: string | null;
    @Field(() => String, { nullable: true }) approvalId: string | null;
    @Field(() => String, { nullable: true }) requestedBy: string | null;
}

@ObjectType()
export class AosRunQueueItem {
    @Field() id: string;
    @Field() routineId: string;
    @Field(() => String, { nullable: true }) requestedBy: string | null;
    @Field(() => String, { nullable: true }) requestedAt: string | null;
    @Field(() => String, { nullable: true }) pickedAt: string | null;
    @Field(() => String, { nullable: true }) runId: string | null;
}

@ObjectType()
export class AosWorkflow {
    @Field() id: string;
    @Field() name: string;
    @Field() description: string;
    @Field() trigger: string;
    @Field(() => GraphQLJSON) graph: Json;
    @Field() enabled: boolean;
    @Field(() => String, { nullable: true }) archivedAt: string | null;
    @Field(() => String, { nullable: true }) createdAt: string | null;
    @Field(() => String, { nullable: true }) updatedAt: string | null;
    // Phase 3 (Workflows)
    @Field(() => String, { nullable: true }) lastRunAt: string | null;
    @Field(() => String, { nullable: true }) lastStatus: string | null;
}

@ObjectType()
export class AosWorkflowRun {
    @Field() id: string;
    @Field() workflowId: string;
    @Field() workflowName: string;
    @Field() status: string;
    @Field() trigger: string;
    /** { [nodeId]: { status, taskId?, approvalId?, startedAt?, finishedAt?, output?, error? } } */
    @Field(() => GraphQLJSON) nodeStates: Json;
    @Field(() => GraphQLJSON) graphSnapshot: Json;
    @Field(() => String, { nullable: true }) routineId: string | null;
    @Field(() => String, { nullable: true }) startedBy: string | null;
    @Field() startedAt: string;
    @Field(() => String, { nullable: true }) finishedAt: string | null;
    @Field(() => String, { nullable: true }) error: string | null;
}

@ObjectType()
export class AosApproval {
    @Field() id: string;
    @Field(() => String, { nullable: true }) taskId: string | null;
    @Field(() => String, { nullable: true }) agentId: string | null;
    @Field() action: string;
    @Field() summary: string;
    @Field(() => GraphQLJSON) payload: Json;
    @Field() status: string;
    @Field(() => String, { nullable: true }) requestedAt: string | null;
    @Field(() => String, { nullable: true }) decidedBy: string | null;
    @Field(() => String, { nullable: true }) decidedAt: string | null;
    @Field(() => String, { nullable: true }) comment: string | null;
    @Field(() => String, { nullable: true }) runId: string | null;
    @Field(() => String, { nullable: true }) routineId: string | null;
    // Phase 3 (Workflows)
    @Field(() => String, { nullable: true }) workflowRunId: string | null;
    @Field(() => String, { nullable: true }) nodeId: string | null;
}

@ObjectType()
export class AosAuditEntry {
    @Field() id: string;
    @Field() actorType: string;
    @Field(() => String, { nullable: true }) actorId: string | null;
    @Field() action: string;
    @Field() entity: string;
    @Field(() => String, { nullable: true }) entityId: string | null;
    @Field() summary: string;
    @Field() level: string;
    @Field(() => String, { nullable: true }) moduleId: string | null;
    @Field(() => String, { nullable: true }) route: string | null;
    @Field(() => GraphQLJSON, { nullable: true }) diff: Json;
    @Field(() => String, { nullable: true }) createdAt: string | null;
}

@ObjectType()
export class AosSettings {
    @Field() tenantId: string;
    @Field(() => Int) dailyRunCeiling: number;
    @Field(() => Int) rollingWindowMinutes: number;
    @Field(() => Int) rollingWindowCeiling: number;
    @Field(() => Float) monthlyTokenBudget: number;
    @Field() killSwitch: boolean;
    @Field() autopilot: boolean;
    @Field(() => Int) autopilotReviewCap: number;
    @Field(() => Int) stepSeconds: number;
    @Field() defaultRunner: string;
    @Field(() => String, { nullable: true }) defaultProvider: string | null;
    @Field(() => String, { nullable: true }) defaultModel: string | null;
    @Field(() => [String]) requireApprovalFor: string[];
    @Field(() => String, { nullable: true }) updatedAt: string | null;
    // Phase 2 (Pulse + Governance)
    @Field() llmMode: string;
    @Field() pulseEnabled: boolean;
    @Field(() => Float) runCostCeilingUsd: number;
    /** Explicit demo badges in Agentic OS UI (task queue still persisted). */
    @Field() uiDemoMode: boolean;
}

@ObjectType()
export class AosCapUsage {
    @Field(() => Float) used: number;
    @Field(() => Float) limit: number;
    /** 0..1 (limit 0 => 0) */
    @Field(() => Float) pct: number;
}

@ObjectType()
export class AosNextRun {
    @Field() routineId: string;
    @Field() name: string;
    @Field(() => String, { nullable: true }) agentId: string | null;
    @Field() nextRunAt: string;
    @Field() cron: string;
    @Field() kind: string;
}

@ObjectType()
export class AosPulseStatus {
    @Field() now: string;
    @Field(() => String, { nullable: true }) lastTickAt: string | null;
    @Field() pulseEnabled: boolean;
    @Field() killSwitch: boolean;
    @Field() llmMode: string;
    @Field(() => String, { nullable: true }) provider: string | null;
    @Field(() => String, { nullable: true }) model: string | null;
    @Field() providerReady: boolean;
    @Field(() => AosCapUsage) dailyRuns: AosCapUsage;
    @Field(() => AosCapUsage) rollingRuns: AosCapUsage;
    @Field(() => AosCapUsage) monthlyTokens: AosCapUsage;
    @Field(() => AosCapUsage) dailyCost: AosCapUsage;
    @Field(() => Int) runsToday: number;
    @Field(() => Int) successToday: number;
    @Field(() => Int) failedToday: number;
    @Field(() => Int) blockedToday: number;
    @Field(() => Int) queueDepth: number;
    @Field(() => [AosNextRun]) nextRuns: AosNextRun[];
}

@ObjectType()
export class AosCronPreview {
    @Field() valid: boolean;
    @Field(() => String, { nullable: true }) error: string | null;
    @Field(() => [String]) next: string[];
}

@ObjectType()
export class AosStats {
    @Field(() => Int) totalAgents: number;
    @Field(() => Int) activeAgents: number;
    @Field(() => Int) queuedTasks: number;
    @Field(() => Int) runningTasks: number;
    @Field(() => Int) reviewTasks: number;
    @Field(() => Int) awaitingApproval: number;
    @Field(() => Int) doneToday: number;
    @Field(() => Int) failedToday: number;
    @Field(() => Int) runsToday: number;
    @Field(() => Float) tokensToday: number;
    @Field(() => Float) costToday: number;
    @Field(() => Int) pendingApprovals: number;
}

@ObjectType()
export class AosTaskQueueEvent {
    @Field() tenantId: string;
    /** queued | running | done | failed | updated | stats */
    @Field() reason: string;
    @Field(() => AosTask, { nullable: true }) task: AosTask | null;
    @Field(() => AosStats, { nullable: true }) stats: AosStats | null;
}

/** Read-only live metrics for the AI Studio UMKM Kasir “first employee” slice. */
@ObjectType()
export class AosKasirLiveSnapshot {
    @Field() available: boolean;
    @Field() tenantId: string;
    @Field() slug: string;
    @Field() name: string;
    @Field() role: string;
    @Field() source: string;
    @Field(() => String, { nullable: true }) unavailableReason: string | null;
    @Field(() => Int, { nullable: true }) waChatsToday: number | null;
    @Field(() => Int, { nullable: true }) transactionsToday: number | null;
    @Field(() => String, { nullable: true }) lastActivityAt: string | null;
    @Field(() => Boolean, { nullable: true }) waOnline: boolean | null;
}

@ObjectType()
export class AosRecruitCatalogEntry {
    @Field() id: string;
    @Field() name: string;
    @Field() role: string;
    @Field() description: string;
    @Field() kind: string;
    @Field() color: string;
    @Field(() => Int) sortOrder: number;
    @Field() recruitable: boolean;
}

@ObjectType()
export class AosRecruitStatus {
    @Field(() => Int) recruitedCount: number;
    @Field(() => Int) maxAgents: number;
    @Field() kasirRecruited: boolean;
    @Field() serviceDeskRecruited: boolean;
    @Field() financeRecruited: boolean;
    @Field() salesRecruited: boolean;
    @Field() devopsRecruited: boolean;
}

@ObjectType()
export class AosRecruitResult {
    @Field(() => AosAgent) agent: AosAgent;
    @Field() waConnectRequired: boolean;
    @Field() message: string;
}

/** F3-2 — aggregated usage from AOS tasks + Studio WA / crawl / builder / KG (no parallel counters). */
@ObjectType()
export class AosAgentUsageMetrics {
    @Field() agentId: string;
    @Field() slug: string;
    @Field() name: string;
    @Field() role: string;
    @Field() status: string;
    @Field(() => Int) tasksCreated: number;
    @Field(() => Int) tasksCompleted: number;
    @Field(() => Int) tasksFailed: number;
    @Field(() => Int) kasirWaTasks: number;
}

@ObjectType()
export class AosTenantUsageMetrics {
    @Field() available: boolean;
    @Field() tenantId: string;
    @Field(() => Int) periodDays: number;
    @Field() periodStart: string;
    @Field() periodEnd: string;
    @Field(() => String, { nullable: true }) unavailableReason: string | null;
    @Field(() => Int) recruitedAgents: number;
    @Field(() => Int, { nullable: true }) waChatsToday: number | null;
    @Field(() => Int, { nullable: true }) tasksCreated: number | null;
    @Field(() => Int, { nullable: true }) tasksCompleted: number | null;
    @Field(() => Int, { nullable: true }) tasksFailed: number | null;
    @Field(() => Int, { nullable: true }) waInboundMessages: number | null;
    @Field(() => Int, { nullable: true }) waOutboundReplies: number | null;
    @Field(() => Int, { nullable: true }) crawlJobs: number | null;
    @Field(() => Int, { nullable: true }) builderWorkflows: number | null;
    @Field(() => Int, { nullable: true }) kgEmbeddedChunks: number | null;
    @Field(() => [AosAgentUsageMetrics]) agents: AosAgentUsageMetrics[];
}

@ObjectType()
export class AosTenantOwnerAgentSettings {
    @Field() agentId: string;
    @Field() slug: string;
    @Field() name: string;
    @Field() role: string;
    @Field() status: string;
    @Field(() => Int) dailyRunBudget: number;
    @Field() quietHoursEnabled: boolean;
    @Field() quietHoursTimezone: string;
    @Field() quietHoursStart: string;
    @Field() quietHoursEnd: string;
}

@InputType()
export class AosTenantOwnerQuietHoursInput {
    @Field(() => Boolean, { nullable: true }) enabled?: boolean;
    @Field(() => String, { nullable: true }) timezone?: string;
    @Field(() => String, { nullable: true }) start?: string;
    @Field(() => String, { nullable: true }) end?: string;
}

@InputType()
export class AosTenantOwnerAgentSettingsInput {
    @Field(() => String, { nullable: true }) status?: string;
    @Field(() => Int, { nullable: true }) dailyRunBudget?: number;
    @Field(() => AosTenantOwnerQuietHoursInput, { nullable: true }) quietHours?: AosTenantOwnerQuietHoursInput | null;
}

// ── Phase 4 (Command Deck · Goals & gate reviews) ───────────────────────────

@ObjectType()
export class AosGoal {
    @Field() id: string;
    @Field() title: string;
    @Field() description: string;
    @Field(() => String, { nullable: true }) areaId: string | null;
    @Field(() => String, { nullable: true }) ownerAgentId: string | null;
    @Field() metric: string;
    @Field(() => Float, { nullable: true }) targetValue: number | null;
    @Field(() => Float, { nullable: true }) currentValue: number | null;
    @Field() unit: string;
    @Field(() => Int) windowDays: number;
    /** 'YYYY-MM-DD' */
    @Field() startsOn: string;
    /** 'YYYY-MM-DD' */
    @Field() gateOn: string;
    @Field() status: string;
    @Field(() => Float) progress: number;
    @Field() nextAction: string;
    /** 'YYYY-MM-DD' */
    @Field(() => String, { nullable: true }) nextActionDue: string | null;
    @Field() color: string;
    @Field(() => Int) sortOrder: number;
    @Field(() => String, { nullable: true }) createdBy: string | null;
    @Field(() => String, { nullable: true }) archivedAt: string | null;
    @Field(() => String, { nullable: true }) createdAt: string | null;
    @Field(() => String, { nullable: true }) updatedAt: string | null;
    // computed
    @Field(() => Int) reviewCount: number;
    @Field(() => String, { nullable: true }) lastReviewedAt: string | null;
    @Field(() => String, { nullable: true }) lastVerdict: string | null;
    /** Linked, non-archived tasks whose status is not done/cancelled. */
    @Field(() => Int) openTasks: number;
    /** Linked, non-archived tasks with status 'done'. */
    @Field(() => Int) doneTasks: number;
}

@ObjectType()
export class AosGoalReview {
    @Field() id: string;
    @Field() goalId: string;
    @Field() verdict: string;
    @Field(() => Float, { nullable: true }) progress: number | null;
    @Field(() => Float, { nullable: true }) currentValue: number | null;
    @Field() note: string;
    @Field(() => String, { nullable: true }) nextAction: string | null;
    @Field(() => String, { nullable: true }) nextGateOn: string | null;
    @Field(() => String, { nullable: true }) reviewedBy: string | null;
    @Field() createdAt: string;
}

@ObjectType()
export class AosDayStats {
    @Field() date: string;
    @Field(() => Int) runs: number;
    @Field(() => Int) success: number;
    @Field(() => Int) failed: number;
    @Field(() => Int) blocked: number;
    @Field(() => Float) costUsd: number;
    @Field(() => Int) tokens: number;
}

@ObjectType()
export class AosWeekStats {
    /** Monday 'YYYY-MM-DD' in the requested timezone. */
    @Field() weekStart: string;
    @Field(() => Int) tasksCreated: number;
    @Field(() => Int) tasksDone: number;
    @Field(() => Int) reviewsWaiting: number;
    @Field(() => Int) approvalsDecided: number;
    @Field(() => Int) approvalsTotal: number;
    @Field(() => Int) notesAdded: number;
    @Field(() => Int) runs: number;
    @Field(() => Int) overdueTasks: number;
}

@ObjectType()
export class AosWeekActivity {
    @Field() weekStart: string;
    @Field(() => Int) tasksDone: number;
    @Field(() => Int) runs: number;
    @Field(() => Int) approvals: number;
    @Field(() => Int) notes: number;
    /** tasksDone + runs + approvals + notes */
    @Field(() => Int) score: number;
}

@ObjectType()
export class AosDeckStats {
    @Field() now: string;
    @Field() timezone: string;
    @Field(() => AosDayStats) today: AosDayStats;
    @Field(() => AosDayStats) yesterday: AosDayStats;
    @Field(() => AosWeekStats) week: AosWeekStats;
    @Field(() => [AosWeekActivity]) weeks: AosWeekActivity[];
}

// ════════════════════════════════════════════════════════════════════════════
// Input types (every writable column optional — partial updates)
// ════════════════════════════════════════════════════════════════════════════

@InputType()
export class AosAgentInput {
    @Field(() => String, { nullable: true }) slug?: string;
    @Field(() => String, { nullable: true }) name?: string;
    @Field(() => String, { nullable: true }) role?: string;
    @Field(() => String, { nullable: true }) description?: string;
    @Field(() => String, { nullable: true }) persona?: string;
    @Field(() => String, { nullable: true }) systemPrompt?: string;
    @Field(() => String, { nullable: true }) provider?: string;
    @Field(() => String, { nullable: true }) model?: string;
    @Field(() => String, { nullable: true }) modelTier?: string;
    @Field(() => Float, { nullable: true }) temperature?: number;
    @Field(() => String, { nullable: true }) effort?: string;
    @Field(() => String, { nullable: true }) color?: string;
    @Field(() => GraphQLJSON, { nullable: true }) avatar?: Json;
    @Field(() => String, { nullable: true }) zone?: string;
    @Field(() => String, { nullable: true }) deskId?: string | null;
    @Field(() => [String], { nullable: true }) modules?: string[];
    @Field(() => [String], { nullable: true }) skills?: string[];
    @Field(() => [String], { nullable: true }) tools?: string[];
    @Field(() => GraphQLJSON, { nullable: true }) permissions?: Json;
    @Field(() => GraphQLJSON, { nullable: true }) guardrails?: Json;
    @Field(() => [String], { nullable: true }) memoryScope?: string[];
    @Field(() => String, { nullable: true }) runner?: string;
    @Field(() => Int, { nullable: true }) dailyTokenBudget?: number;
    @Field(() => Int, { nullable: true }) dailyRunBudget?: number;
    @Field(() => String, { nullable: true }) status?: string;
    @Field(() => GraphQLJSON, { nullable: true }) stats?: Json;
}

@InputType()
export class AosPlaybookInput {
    @Field(() => String, { nullable: true }) agentId?: string | null;
    @Field(() => String, { nullable: true }) moduleId?: string;
    @Field(() => String, { nullable: true }) route?: string;
    @Field(() => String, { nullable: true }) title?: string;
    @Field(() => String, { nullable: true }) description?: string;
    @Field(() => [String], { nullable: true }) steps?: string[];
    @Field(() => String, { nullable: true }) priority?: string;
    @Field(() => Int, { nullable: true }) estimatedMinutes?: number;
    @Field(() => Boolean, { nullable: true }) requiresApproval?: boolean;
    @Field(() => Boolean, { nullable: true }) enabled?: boolean;
    @Field(() => Int, { nullable: true }) sortOrder?: number;
}

@InputType()
export class AosTaskInput {
    @Field(() => String, { nullable: true }) agentId?: string | null;
    @Field(() => String, { nullable: true }) playbookId?: string | null;
    @Field(() => String, { nullable: true }) routineId?: string | null;
    @Field(() => String, { nullable: true }) workflowId?: string | null;
    @Field(() => String, { nullable: true }) title?: string;
    @Field(() => String, { nullable: true }) description?: string;
    @Field(() => String, { nullable: true }) moduleId?: string;
    @Field(() => String, { nullable: true }) route?: string;
    @Field(() => [String], { nullable: true }) steps?: string[];
    @Field(() => String, { nullable: true }) status?: string;
    @Field(() => String, { nullable: true }) priority?: string;
    @Field(() => Int, { nullable: true }) sortOrder?: number;
    @Field(() => String, { nullable: true }) source?: string;
    @Field(() => Boolean, { nullable: true }) requiresApproval?: boolean;
    @Field(() => String, { nullable: true }) dueAt?: string | null;
    @Field(() => String, { nullable: true }) result?: string | null;
    @Field(() => String, { nullable: true }) error?: string | null;
    @Field(() => String, { nullable: true }) goalId?: string | null;
}

@InputType()
export class AosMemoryAreaInput {
    @Field(() => String, { nullable: true }) slug?: string;
    @Field(() => String, { nullable: true }) name?: string;
    @Field(() => String, { nullable: true }) description?: string;
    @Field(() => String, { nullable: true }) color?: string;
    @Field(() => String, { nullable: true }) ownerAgentId?: string | null;
    @Field(() => Int, { nullable: true }) sortOrder?: number;
}

@InputType()
export class AosMemoryItemInput {
    @Field(() => String, { nullable: true }) areaId?: string;
    @Field(() => String, { nullable: true }) section?: string;
    @Field(() => String, { nullable: true }) kind?: string;
    @Field(() => String, { nullable: true }) title?: string;
    @Field(() => String, { nullable: true }) path?: string | null;
    @Field(() => String, { nullable: true }) note?: string;
    @Field(() => String, { nullable: true }) content?: string;
    @Field(() => [String], { nullable: true }) tags?: string[];
    @Field(() => Boolean, { nullable: true }) pinned?: boolean;
    @Field(() => [String], { nullable: true }) agentIds?: string[];
    @Field(() => String, { nullable: true }) health?: string;
    @Field(() => String, { nullable: true }) lastVerifiedAt?: string | null;
}

@InputType()
export class AosRoutineInput {
    @Field(() => String, { nullable: true }) name?: string;
    @Field(() => String, { nullable: true }) description?: string;
    @Field(() => String, { nullable: true }) agentId?: string | null;
    @Field(() => String, { nullable: true }) cron?: string;
    @Field(() => String, { nullable: true }) timezone?: string;
    @Field(() => String, { nullable: true }) runner?: string;
    @Field(() => String, { nullable: true }) kind?: string;
    @Field(() => String, { nullable: true }) playbookId?: string | null;
    @Field(() => String, { nullable: true }) prompt?: string;
    @Field(() => String, { nullable: true }) model?: string | null;
    @Field(() => String, { nullable: true }) effort?: string;
    @Field(() => [String], { nullable: true }) allowedTools?: string[];
    @Field(() => Int, { nullable: true }) maxTurns?: number;
    @Field(() => Int, { nullable: true }) timeoutSeconds?: number;
    @Field(() => String, { nullable: true }) outputTarget?: string;
    @Field(() => Boolean, { nullable: true }) enabled?: boolean;
    @Field(() => String, { nullable: true }) nextRunAt?: string | null;
    @Field(() => String, { nullable: true }) workflowId?: string | null;
}

@InputType()
export class AosWorkflowInput {
    @Field(() => String, { nullable: true }) name?: string;
    @Field(() => String, { nullable: true }) description?: string;
    @Field(() => String, { nullable: true }) trigger?: string;
    @Field(() => GraphQLJSON, { nullable: true }) graph?: Json;
    @Field(() => Boolean, { nullable: true }) enabled?: boolean;
}

@InputType()
export class AosSettingsInput {
    @Field(() => Int, { nullable: true }) dailyRunCeiling?: number;
    @Field(() => Int, { nullable: true }) rollingWindowMinutes?: number;
    @Field(() => Int, { nullable: true }) rollingWindowCeiling?: number;
    @Field(() => Float, { nullable: true }) monthlyTokenBudget?: number;
    @Field(() => Boolean, { nullable: true }) killSwitch?: boolean;
    @Field(() => Boolean, { nullable: true }) autopilot?: boolean;
    @Field(() => Int, { nullable: true }) autopilotReviewCap?: number;
    @Field(() => Int, { nullable: true }) stepSeconds?: number;
    @Field(() => String, { nullable: true }) defaultRunner?: string;
    @Field(() => String, { nullable: true }) defaultProvider?: string | null;
    @Field(() => String, { nullable: true }) defaultModel?: string | null;
    @Field(() => [String], { nullable: true }) requireApprovalFor?: string[];
    @Field(() => String, { nullable: true }) llmMode?: string;
    @Field(() => Boolean, { nullable: true }) pulseEnabled?: boolean;
    @Field(() => Float, { nullable: true }) runCostCeilingUsd?: number;
    @Field(() => Boolean, { nullable: true }) uiDemoMode?: boolean;
}

// ── Phase 4 (Goals & gate reviews) ───────────────────────────────────────────

@InputType()
export class AosGoalInput {
    @Field(() => String, { nullable: true }) title?: string;
    @Field(() => String, { nullable: true }) description?: string;
    @Field(() => String, { nullable: true }) areaId?: string | null;
    @Field(() => String, { nullable: true }) ownerAgentId?: string | null;
    @Field(() => String, { nullable: true }) metric?: string;
    @Field(() => Float, { nullable: true }) targetValue?: number | null;
    @Field(() => Float, { nullable: true }) currentValue?: number | null;
    @Field(() => String, { nullable: true }) unit?: string;
    @Field(() => Int, { nullable: true }) windowDays?: number;
    @Field(() => String, { nullable: true }) startsOn?: string;
    @Field(() => String, { nullable: true }) gateOn?: string;
    @Field(() => String, { nullable: true }) status?: string;
    @Field(() => Float, { nullable: true }) progress?: number;
    @Field(() => String, { nullable: true }) nextAction?: string;
    @Field(() => String, { nullable: true }) nextActionDue?: string | null;
    @Field(() => String, { nullable: true }) color?: string;
    @Field(() => Int, { nullable: true }) sortOrder?: number;
}

@InputType()
export class AosGoalReviewInput {
    @Field() goalId: string;
    @Field() verdict: string;
    @Field(() => Float, { nullable: true }) progress?: number | null;
    @Field(() => Float, { nullable: true }) currentValue?: number | null;
    @Field(() => String, { nullable: true }) note?: string | null;
    @Field(() => String, { nullable: true }) nextAction?: string | null;
    @Field(() => String, { nullable: true }) nextGateOn?: string | null;
}
