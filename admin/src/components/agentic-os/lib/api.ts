/**
 * Agentic OS — GraphQL client for the middleware `agentic-os` module.
 * Reads are open; mutations need a signed-in session (Bearer token).
 */

import { getStoredToken } from "@/lib/graphqlClient";
import type {
    OsAgent,
    OsAgentInput,
    OsAgentVersion,
    OsApproval,
    OsAuditEntry,
    OsCronPreview,
    OsMemoryArea,
    OsMemoryAreaInput,
    OsMemoryItem,
    OsMemoryItemInput,
    OsPlaybook,
    OsPlaybookInput,
    OsPulseSettings,
    OsPulseStatus,
    OsRoutine,
    OsRoutineInput,
    OsRun,
    OsRunQueueItem,
    OsSettings,
    OsSettingsInput,
    OsStats,
    OsTask,
    OsTaskInput,
    OsWorkflow,
    OsWorkflowInput,
    OsWorkflowRun,
    WfGraph,
} from "./types";

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://127.0.0.1:4001/graphql";

export class AosError extends Error {
    constructor(
        message: string,
        public readonly unauthorized = false,
    ) {
        super(message);
    }
}

export async function aosGql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = typeof window !== "undefined" ? getStoredToken() : null;
    if (token) headers.Authorization = `Bearer ${token}`;
    let res: Response;
    try {
        res = await fetch(GRAPHQL_URL, { method: "POST", headers, body: JSON.stringify({ query, variables }) });
    } catch {
        throw new AosError("Agentic OS backend is unreachable");
    }
    const json = (await res.json().catch(() => null)) as { data?: T; errors?: { message: string; extensions?: { code?: string } }[] } | null;
    if (!json) throw new AosError(`Agentic OS backend error (${res.status})`);
    if (json.errors?.length) {
        const e = json.errors[0];
        const unauthorized = e.extensions?.code === "UNAUTHENTICATED" || /sign in|unauthori|authentication/i.test(e.message);
        throw new AosError(e.message, unauthorized);
    }
    return json.data as T;
}

/* ------------------------------------------------------------------ */
/* Field sets                                                          */
/* ------------------------------------------------------------------ */

const AGENT = `id slug name role description persona systemPrompt provider model modelTier temperature effort color avatar
  zone deskId modules skills tools permissions guardrails memoryScope runner dailyTokenBudget dailyRunBudget status version
  stats createdBy archivedAt createdAt updatedAt`;
const PLAYBOOK = `id agentId moduleId route title description steps priority estimatedMinutes requiresApproval enabled sortOrder
  archivedAt createdAt updatedAt`;
const TASK = `id agentId playbookId routineId workflowId title description moduleId route steps status progress priority sortOrder
  source requiresApproval dueAt startedAt finishedAt completedAt completedBy result error requestedBy archivedAt createdAt updatedAt`;
const APPROVAL = `id taskId agentId action summary payload status requestedAt decidedBy decidedAt comment`;
const AUDIT = `id actorType actorId action entity entityId summary level moduleId route createdAt`;
const SETTINGS = `tenantId dailyRunCeiling rollingWindowMinutes rollingWindowCeiling monthlyTokenBudget killSwitch autopilot
  autopilotReviewCap stepSeconds defaultRunner defaultProvider defaultModel requireApprovalFor updatedAt`;
const STATS = `totalAgents activeAgents queuedTasks runningTasks reviewTasks awaitingApproval doneToday failedToday runsToday
  tokensToday costToday pendingApprovals`;

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

export interface AosSnapshot {
    agents: OsAgent[];
    playbooks: OsPlaybook[];
    tasks: OsTask[];
    approvals: OsApproval[];
    settings: OsSettings;
    stats: OsStats;
}

/** Everything the OS + Virtual Office need, in one round-trip. */
export async function fetchSnapshot(includeArchived = false): Promise<AosSnapshot> {
    const d = await aosGql<{
        aosAgents: OsAgent[];
        aosPlaybooks: OsPlaybook[];
        aosTasks: OsTask[];
        aosApprovals: OsApproval[];
        aosSettings: OsSettings;
        aosStats: OsStats;
    }>(
        `query AosSnapshot($inc: Boolean) {
            aosAgents(includeArchived: $inc) { ${AGENT} }
            aosPlaybooks(includeArchived: $inc) { ${PLAYBOOK} }
            aosTasks(limit: 400) { ${TASK} }
            aosApprovals(status: "pending") { ${APPROVAL} }
            aosSettings { ${SETTINGS} }
            aosStats { ${STATS} }
        }`,
        { inc: includeArchived },
    );
    return {
        agents: d.aosAgents,
        playbooks: d.aosPlaybooks,
        tasks: d.aosTasks,
        approvals: d.aosApprovals,
        settings: d.aosSettings,
        stats: d.aosStats,
    };
}

export async function fetchAudit(opts: { since?: string; entity?: string; entityId?: string; actorId?: string; limit?: number } = {}) {
    const d = await aosGql<{ aosAudit: OsAuditEntry[] }>(
        `query AosAudit($since: String, $entity: String, $entityId: String, $actorId: String, $limit: Int) {
            aosAudit(since: $since, entity: $entity, entityId: $entityId, actorId: $actorId, limit: $limit) { ${AUDIT} }
        }`,
        { limit: 60, ...opts },
    );
    return d.aosAudit;
}

export async function fetchAgentVersions(agentId: string) {
    const d = await aosGql<{ aosAgentVersions: OsAgentVersion[] }>(
        `query($agentId: String!) { aosAgentVersions(agentId: $agentId) { id agentId version snapshot changeNote changedBy createdAt } }`,
        { agentId },
    );
    return d.aosAgentVersions;
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

const m = async <K extends string, T>(key: K, gql: string, vars: Record<string, unknown>): Promise<T> => {
    const d = await aosGql<Record<K, T>>(gql, vars);
    return d[key];
};

export const aosApi = {
    createAgent: (input: OsAgentInput) =>
        m<"aosCreateAgent", OsAgent>("aosCreateAgent", `mutation($input: AosAgentInput!) { aosCreateAgent(input: $input) { ${AGENT} } }`, { input }),
    updateAgent: (id: string, input: OsAgentInput, changeNote?: string) =>
        m<"aosUpdateAgent", OsAgent>(
            "aosUpdateAgent",
            `mutation($id: String!, $input: AosAgentInput!, $note: String) { aosUpdateAgent(id: $id, input: $input, changeNote: $note) { ${AGENT} } }`,
            { id, input, note: changeNote },
        ),
    cloneAgent: (id: string, name?: string) =>
        m<"aosCloneAgent", OsAgent>("aosCloneAgent", `mutation($id: String!, $name: String) { aosCloneAgent(id: $id, name: $name) { ${AGENT} } }`, { id, name }),
    archiveAgent: (id: string) =>
        m<"aosArchiveAgent", OsAgent>("aosArchiveAgent", `mutation($id: String!) { aosArchiveAgent(id: $id) { ${AGENT} } }`, { id }),
    restoreAgent: (id: string) =>
        m<"aosRestoreAgent", OsAgent>("aosRestoreAgent", `mutation($id: String!) { aosRestoreAgent(id: $id) { ${AGENT} } }`, { id }),
    restoreAgentVersion: (agentId: string, version: number) =>
        m<"aosRestoreAgentVersion", OsAgent>(
            "aosRestoreAgentVersion",
            `mutation($agentId: String!, $version: Int!) { aosRestoreAgentVersion(agentId: $agentId, version: $version) { ${AGENT} } }`,
            { agentId, version },
        ),

    createPlaybook: (input: OsPlaybookInput) =>
        m<"aosCreatePlaybook", OsPlaybook>("aosCreatePlaybook", `mutation($input: AosPlaybookInput!) { aosCreatePlaybook(input: $input) { ${PLAYBOOK} } }`, { input }),
    updatePlaybook: (id: string, input: OsPlaybookInput) =>
        m<"aosUpdatePlaybook", OsPlaybook>(
            "aosUpdatePlaybook",
            `mutation($id: String!, $input: AosPlaybookInput!) { aosUpdatePlaybook(id: $id, input: $input) { ${PLAYBOOK} } }`,
            { id, input },
        ),
    archivePlaybook: (id: string) =>
        m<"aosArchivePlaybook", OsPlaybook>("aosArchivePlaybook", `mutation($id: String!) { aosArchivePlaybook(id: $id) { ${PLAYBOOK} } }`, { id }),
    restorePlaybook: (id: string) =>
        m<"aosRestorePlaybook", OsPlaybook>("aosRestorePlaybook", `mutation($id: String!) { aosRestorePlaybook(id: $id) { ${PLAYBOOK} } }`, { id }),

    createTask: (input: OsTaskInput) =>
        m<"aosCreateTask", OsTask>("aosCreateTask", `mutation($input: AosTaskInput!) { aosCreateTask(input: $input) { ${TASK} } }`, { input }),
    updateTask: (id: string, input: OsTaskInput) =>
        m<"aosUpdateTask", OsTask>("aosUpdateTask", `mutation($id: String!, $input: AosTaskInput!) { aosUpdateTask(id: $id, input: $input) { ${TASK} } }`, { id, input }),
    reorderTasks: (ids: string[]) => m<"aosReorderTasks", boolean>("aosReorderTasks", `mutation($ids: [String!]!) { aosReorderTasks(ids: $ids) }`, { ids }),
    completeTask: (id: string) =>
        m<"aosCompleteTask", OsTask>("aosCompleteTask", `mutation($id: String!) { aosCompleteTask(id: $id) { ${TASK} } }`, { id }),
    cancelTask: (id: string) => m<"aosCancelTask", OsTask>("aosCancelTask", `mutation($id: String!) { aosCancelTask(id: $id) { ${TASK} } }`, { id }),
    retryTask: (id: string) => m<"aosRetryTask", OsTask>("aosRetryTask", `mutation($id: String!) { aosRetryTask(id: $id) { ${TASK} } }`, { id }),
    archiveTask: (id: string) => m<"aosArchiveTask", OsTask>("aosArchiveTask", `mutation($id: String!) { aosArchiveTask(id: $id) { ${TASK} } }`, { id }),

    decideApproval: (id: string, approve: boolean, comment?: string) =>
        m<"aosDecideApproval", OsApproval>(
            "aosDecideApproval",
            `mutation($id: String!, $approve: Boolean!, $comment: String) { aosDecideApproval(id: $id, approve: $approve, comment: $comment) { ${APPROVAL} } }`,
            { id, approve, comment },
        ),
    updateSettings: (input: OsSettingsInput) =>
        m<"aosUpdateSettings", OsSettings>("aosUpdateSettings", `mutation($input: AosSettingsInput!) { aosUpdateSettings(input: $input) { ${SETTINGS} } }`, { input }),
    setKillSwitch: (on: boolean) =>
        m<"aosSetKillSwitch", OsSettings>("aosSetKillSwitch", `mutation($on: Boolean!) { aosSetKillSwitch(on: $on) { ${SETTINGS} } }`, { on }),
};

/* ------------------------------------------------------------------ */
/* Phase 2 — Pulse + Governance                                        */
/* ------------------------------------------------------------------ */

const ROUTINE = `id name description agentId cron timezone runner kind playbookId workflowId prompt model effort allowedTools maxTurns
  timeoutSeconds outputTarget enabled lastRunAt nextRunAt lastStatus archivedAt createdAt updatedAt`;
const RUN = `id routineId taskId agentId trigger provider model turns tokensIn tokensOut costUsd durationMs status output error
  startedAt finishedAt routineName kind outputTarget prompt blockedReason approvalId requestedBy`;
const QUEUE = `id routineId requestedBy requestedAt pickedAt runId`;
const CAP = `used limit pct`;
const PULSE = `now lastTickAt pulseEnabled killSwitch llmMode provider model providerReady
  dailyRuns { ${CAP} } rollingRuns { ${CAP} } monthlyTokens { ${CAP} } dailyCost { ${CAP} }
  runsToday successToday failedToday blockedToday queueDepth
  nextRuns { routineId name agentId nextRunAt cron kind }`;

export interface PulseSnapshot {
    routines: OsRoutine[];
    runs: OsRun[];
    queue: OsRunQueueItem[];
    status: OsPulseStatus;
    settings: OsPulseSettings;
    approvals: OsApproval[];
}

export async function fetchPulse(includeArchived = false, runLimit = 150): Promise<PulseSnapshot> {
    const d = await aosGql<{
        aosRoutines: OsRoutine[];
        aosRuns: OsRun[];
        aosRunQueue: OsRunQueueItem[];
        aosPulseStatus: OsPulseStatus;
        aosSettings: OsPulseSettings;
        aosApprovals: OsApproval[];
    }>(
        `query AosPulse($inc: Boolean, $limit: Int) {
            aosRoutines(includeArchived: $inc) { ${ROUTINE} }
            aosRuns(limit: $limit, pulseOnly: true) { ${RUN} }
            aosRunQueue { ${QUEUE} }
            aosPulseStatus { ${PULSE} }
            aosSettings { llmMode pulseEnabled runCostCeilingUsd }
            aosApprovals { ${APPROVAL} runId routineId }
        }`,
        { inc: includeArchived, limit: runLimit },
    );
    return {
        routines: d.aosRoutines,
        runs: d.aosRuns,
        queue: d.aosRunQueue,
        status: d.aosPulseStatus,
        settings: d.aosSettings,
        approvals: d.aosApprovals,
    };
}

export async function fetchRuns(opts: { routineId?: string; agentId?: string; status?: string; limit?: number; pulseOnly?: boolean } = {}) {
    const d = await aosGql<{ aosRuns: OsRun[] }>(
        `query($routineId: String, $agentId: String, $status: String, $limit: Int, $pulseOnly: Boolean) {
            aosRuns(routineId: $routineId, agentId: $agentId, status: $status, limit: $limit, pulseOnly: $pulseOnly) { ${RUN} }
        }`,
        { limit: 100, pulseOnly: true, ...opts },
    );
    return d.aosRuns;
}

export async function fetchCronPreview(cron: string, timezone = "Asia/Jakarta", count = 5): Promise<OsCronPreview> {
    const d = await aosGql<{ aosCronPreview: OsCronPreview }>(
        `query($cron: String!, $tz: String, $count: Int) { aosCronPreview(cron: $cron, timezone: $tz, count: $count) { valid error next } }`,
        { cron, tz: timezone, count },
    );
    return d.aosCronPreview;
}

export interface AuditFilter {
    since?: string;
    until?: string;
    entity?: string;
    entityId?: string;
    actorId?: string;
    level?: string;
    action?: string;
    search?: string;
    limit?: number;
}

/** Audit with the Phase 2 filters (level / action / search / until). */
export async function fetchAuditFiltered(f: AuditFilter = {}) {
    const vars = Object.fromEntries(Object.entries({ limit: 200, ...f }).filter(([, v]) => v !== "" && v !== undefined));
    const d = await aosGql<{ aosAudit: (OsAuditEntry & { diff?: Record<string, unknown> | null })[] }>(
        `query($since: String, $until: String, $entity: String, $entityId: String, $actorId: String, $level: String, $action: String, $search: String, $limit: Int) {
            aosAudit(since: $since, until: $until, entity: $entity, entityId: $entityId, actorId: $actorId, level: $level, action: $action, search: $search, limit: $limit) { ${AUDIT} diff }
        }`,
        vars,
    );
    return d.aosAudit;
}

export const pulseApi = {
    createRoutine: (input: OsRoutineInput) =>
        m<"aosCreateRoutine", OsRoutine>("aosCreateRoutine", `mutation($input: AosRoutineInput!) { aosCreateRoutine(input: $input) { ${ROUTINE} } }`, { input }),
    updateRoutine: (id: string, input: OsRoutineInput) =>
        m<"aosUpdateRoutine", OsRoutine>("aosUpdateRoutine", `mutation($id: String!, $input: AosRoutineInput!) { aosUpdateRoutine(id: $id, input: $input) { ${ROUTINE} } }`, { id, input }),
    archiveRoutine: (id: string) =>
        m<"aosArchiveRoutine", OsRoutine>("aosArchiveRoutine", `mutation($id: String!) { aosArchiveRoutine(id: $id) { ${ROUTINE} } }`, { id }),
    restoreRoutine: (id: string) =>
        m<"aosRestoreRoutine", OsRoutine>("aosRestoreRoutine", `mutation($id: String!) { aosRestoreRoutine(id: $id) { ${ROUTINE} } }`, { id }),
    setRoutineEnabled: (id: string, enabled: boolean) =>
        m<"aosSetRoutineEnabled", OsRoutine>(
            "aosSetRoutineEnabled",
            `mutation($id: String!, $enabled: Boolean!) { aosSetRoutineEnabled(id: $id, enabled: $enabled) { ${ROUTINE} } }`,
            { id, enabled },
        ),
    queueRoutine: (routineId: string) =>
        m<"aosQueueRoutine", OsRunQueueItem>("aosQueueRoutine", `mutation($routineId: String!) { aosQueueRoutine(routineId: $routineId) { ${QUEUE} } }`, { routineId }),
    cancelQueued: (id: string) => m<"aosCancelQueued", boolean>("aosCancelQueued", `mutation($id: String!) { aosCancelQueued(id: $id) }`, { id }),
    runRoutineNow: (routineId: string) =>
        m<"aosRunRoutineNow", OsRun>("aosRunRoutineNow", `mutation($routineId: String!) { aosRunRoutineNow(routineId: $routineId) { ${RUN} } }`, { routineId }),
    testAgent: (agentId: string, prompt: string) =>
        m<"aosTestAgent", OsRun>("aosTestAgent", `mutation($agentId: String!, $prompt: String!) { aosTestAgent(agentId: $agentId, prompt: $prompt) { ${RUN} } }`, {
            agentId,
            prompt,
        }),
    updatePulseSettings: (input: Partial<OsPulseSettings> & OsSettingsInput) =>
        m<"aosUpdateSettings", OsSettings & OsPulseSettings>(
            "aosUpdateSettings",
            `mutation($input: AosSettingsInput!) { aosUpdateSettings(input: $input) { ${SETTINGS} llmMode pulseEnabled runCostCeilingUsd } }`,
            { input },
        ),
};

/* ------------------------------------------------------------------ */
/* Phase 3 — Memory Map + Workflows                                    */
/* ------------------------------------------------------------------ */

const AREA = `id slug name description color ownerAgentId sortOrder itemCount archivedAt createdAt updatedAt`;
const ITEM = `id areaId section kind title path note content tags pinned agentIds health lastVerifiedAt archivedAt createdAt updatedAt`;
const WORKFLOW = `id name description trigger graph enabled lastRunAt lastStatus archivedAt createdAt updatedAt`;
const WF_RUN = `id workflowId workflowName status trigger nodeStates graphSnapshot routineId startedBy startedAt finishedAt error`;

export interface Phase3Snapshot {
    areas: OsMemoryArea[];
    items: OsMemoryItem[];
    workflows: OsWorkflow[];
    workflowRuns: OsWorkflowRun[];
}

export async function fetchPhase3(includeArchived = false, runLimit = 60): Promise<Phase3Snapshot> {
    const d = await aosGql<{
        aosMemoryAreas: OsMemoryArea[];
        aosMemoryItems: OsMemoryItem[];
        aosWorkflows: OsWorkflow[];
        aosWorkflowRuns: OsWorkflowRun[];
    }>(
        `query AosPhase3($inc: Boolean, $limit: Int) {
            aosMemoryAreas(includeArchived: $inc) { ${AREA} }
            aosMemoryItems(includeArchived: $inc) { ${ITEM} }
            aosWorkflows(includeArchived: $inc) { ${WORKFLOW} }
            aosWorkflowRuns(limit: $limit) { ${WF_RUN} }
        }`,
        { inc: includeArchived, limit: runLimit },
    );
    return { areas: d.aosMemoryAreas, items: d.aosMemoryItems, workflows: d.aosWorkflows, workflowRuns: d.aosWorkflowRuns };
}

export async function fetchWorkflowRun(id: string) {
    const d = await aosGql<{ aosWorkflowRun: OsWorkflowRun | null }>(`query($id: String!) { aosWorkflowRun(id: $id) { ${WF_RUN} } }`, { id });
    return d.aosWorkflowRun;
}

export async function validateWorkflow(graph: WfGraph) {
    const d = await aosGql<{ aosValidateWorkflow: string[] }>(`query($graph: JSON!) { aosValidateWorkflow(graph: $graph) }`, { graph });
    return d.aosValidateWorkflow;
}

export const phase3Api = {
    createArea: (input: OsMemoryAreaInput) =>
        m<"aosCreateMemoryArea", OsMemoryArea>("aosCreateMemoryArea", `mutation($input: AosMemoryAreaInput!) { aosCreateMemoryArea(input: $input) { ${AREA} } }`, { input }),
    updateArea: (id: string, input: OsMemoryAreaInput) =>
        m<"aosUpdateMemoryArea", OsMemoryArea>(
            "aosUpdateMemoryArea",
            `mutation($id: String!, $input: AosMemoryAreaInput!) { aosUpdateMemoryArea(id: $id, input: $input) { ${AREA} } }`,
            { id, input },
        ),
    archiveArea: (id: string) =>
        m<"aosArchiveMemoryArea", OsMemoryArea>("aosArchiveMemoryArea", `mutation($id: String!) { aosArchiveMemoryArea(id: $id) { ${AREA} } }`, { id }),
    restoreArea: (id: string) =>
        m<"aosRestoreMemoryArea", OsMemoryArea>("aosRestoreMemoryArea", `mutation($id: String!) { aosRestoreMemoryArea(id: $id) { ${AREA} } }`, { id }),

    createItem: (input: OsMemoryItemInput) =>
        m<"aosCreateMemoryItem", OsMemoryItem>("aosCreateMemoryItem", `mutation($input: AosMemoryItemInput!) { aosCreateMemoryItem(input: $input) { ${ITEM} } }`, { input }),
    updateItem: (id: string, input: OsMemoryItemInput) =>
        m<"aosUpdateMemoryItem", OsMemoryItem>(
            "aosUpdateMemoryItem",
            `mutation($id: String!, $input: AosMemoryItemInput!) { aosUpdateMemoryItem(id: $id, input: $input) { ${ITEM} } }`,
            { id, input },
        ),
    archiveItem: (id: string) =>
        m<"aosArchiveMemoryItem", OsMemoryItem>("aosArchiveMemoryItem", `mutation($id: String!) { aosArchiveMemoryItem(id: $id) { ${ITEM} } }`, { id }),
    restoreItem: (id: string) =>
        m<"aosRestoreMemoryItem", OsMemoryItem>("aosRestoreMemoryItem", `mutation($id: String!) { aosRestoreMemoryItem(id: $id) { ${ITEM} } }`, { id }),
    verifyItem: (id: string) =>
        m<"aosVerifyMemoryItem", OsMemoryItem>("aosVerifyMemoryItem", `mutation($id: String!) { aosVerifyMemoryItem(id: $id) { ${ITEM} } }`, { id }),
    runMemoryCheck: () => m<"aosRunMemoryCheck", OsRun>("aosRunMemoryCheck", `mutation { aosRunMemoryCheck { ${RUN} } }`, {}),

    createWorkflow: (input: OsWorkflowInput) =>
        m<"aosCreateWorkflow", OsWorkflow>("aosCreateWorkflow", `mutation($input: AosWorkflowInput!) { aosCreateWorkflow(input: $input) { ${WORKFLOW} } }`, { input }),
    updateWorkflow: (id: string, input: OsWorkflowInput) =>
        m<"aosUpdateWorkflow", OsWorkflow>(
            "aosUpdateWorkflow",
            `mutation($id: String!, $input: AosWorkflowInput!) { aosUpdateWorkflow(id: $id, input: $input) { ${WORKFLOW} } }`,
            { id, input },
        ),
    archiveWorkflow: (id: string) =>
        m<"aosArchiveWorkflow", OsWorkflow>("aosArchiveWorkflow", `mutation($id: String!) { aosArchiveWorkflow(id: $id) { ${WORKFLOW} } }`, { id }),
    restoreWorkflow: (id: string) =>
        m<"aosRestoreWorkflow", OsWorkflow>("aosRestoreWorkflow", `mutation($id: String!) { aosRestoreWorkflow(id: $id) { ${WORKFLOW} } }`, { id }),
    runWorkflow: (id: string) => m<"aosRunWorkflow", OsWorkflowRun>("aosRunWorkflow", `mutation($id: String!) { aosRunWorkflow(id: $id) { ${WF_RUN} } }`, { id }),
    cancelWorkflowRun: (id: string) =>
        m<"aosCancelWorkflowRun", OsWorkflowRun>("aosCancelWorkflowRun", `mutation($id: String!) { aosCancelWorkflowRun(id: $id) { ${WF_RUN} } }`, { id }),
};
