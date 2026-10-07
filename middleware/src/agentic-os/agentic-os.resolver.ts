import { UseGuards } from '@nestjs/common';
import { Args, Context, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { AgenticOsService, AosActor } from './agentic-os.service';
import { AgenticOsPulse } from './agentic-os.pulse';
import { AgenticOsWorkflows } from './agentic-os.workflows';
import { AosAuthGuard } from './aos-auth.guard';
import {
    AosAgent,
    AosAgentInput,
    AosAgentVersion,
    AosApproval,
    AosAuditEntry,
    AosCronPreview,
    AosMemoryArea,
    AosMemoryAreaInput,
    AosMemoryItem,
    AosMemoryItemInput,
    AosPlaybook,
    AosPlaybookInput,
    AosPulseStatus,
    AosRoutine,
    AosRoutineInput,
    AosRun,
    AosRunQueueItem,
    AosSettings,
    AosSettingsInput,
    AosStats,
    AosTask,
    AosTaskInput,
    AosWorkflow,
    AosWorkflowInput,
    AosWorkflowRun,
} from './agentic-os.types';

type AosContext = { req?: { user?: { id?: string } | null } };

const actorOf = (ctx: AosContext): AosActor => ({ id: ctx?.req?.user?.id ?? null });

// Reusable arg options
const optStr = { type: () => String, nullable: true } as const;
const archivedArg = { type: () => Boolean, nullable: true, defaultValue: false } as const;

@Resolver()
export class AgenticOsResolver {
    constructor(
        private readonly svc: AgenticOsService,
        private readonly pulse: AgenticOsPulse,
        private readonly workflows: AgenticOsWorkflows,
    ) {}

    // ════════════════════════════════════════════════════════════════════════
    // Queries (open, like the rest of the app)
    // ════════════════════════════════════════════════════════════════════════

    @Query(() => [AosAgent])
    aosAgents(
        @Args('tenantId', optStr) tenantId?: string,
        @Args('includeArchived', archivedArg) includeArchived?: boolean,
    ) {
        return this.svc.listAgents(tenantId, includeArchived);
    }

    @Query(() => AosAgent, { nullable: true })
    aosAgent(@Args('id') id: string) {
        return this.svc.getAgent(id);
    }

    @Query(() => [AosAgentVersion])
    aosAgentVersions(@Args('agentId') agentId: string) {
        return this.svc.listAgentVersions(agentId);
    }

    @Query(() => [AosPlaybook])
    aosPlaybooks(
        @Args('tenantId', optStr) tenantId?: string,
        @Args('moduleId', optStr) moduleId?: string,
        @Args('agentId', optStr) agentId?: string,
        @Args('includeArchived', archivedArg) includeArchived?: boolean,
    ) {
        return this.svc.listPlaybooks({ tenantId, moduleId, agentId, includeArchived });
    }

    @Query(() => [AosTask])
    aosTasks(
        @Args('tenantId', optStr) tenantId?: string,
        @Args('agentId', optStr) agentId?: string,
        @Args('statuses', { type: () => [String], nullable: true }) statuses?: string[],
        @Args('includeArchived', archivedArg) includeArchived?: boolean,
        @Args('limit', { type: () => Int, nullable: true, defaultValue: 300 }) limit?: number,
    ) {
        return this.svc.listTasks({ tenantId, agentId, statuses, includeArchived, limit });
    }

    @Query(() => [AosMemoryArea])
    aosMemoryAreas(
        @Args('tenantId', optStr) tenantId?: string,
        @Args('includeArchived', archivedArg) includeArchived?: boolean,
    ) {
        return this.svc.listMemoryAreas(tenantId, includeArchived);
    }

    @Query(() => [AosMemoryItem])
    aosMemoryItems(
        @Args('tenantId', optStr) tenantId?: string,
        @Args('areaId', optStr) areaId?: string,
        @Args('includeArchived', archivedArg) includeArchived?: boolean,
    ) {
        return this.svc.listMemoryItems(tenantId, areaId, includeArchived);
    }

    @Query(() => [AosRoutine])
    aosRoutines(
        @Args('tenantId', optStr) tenantId?: string,
        @Args('agentId', optStr) agentId?: string,
        @Args('includeArchived', archivedArg) includeArchived?: boolean,
    ) {
        return this.svc.listRoutines(tenantId, agentId, includeArchived);
    }

    @Query(() => [AosRun])
    aosRuns(
        @Args('tenantId', optStr) tenantId?: string,
        @Args('routineId', optStr) routineId?: string,
        @Args('agentId', optStr) agentId?: string,
        @Args('status', optStr) status?: string,
        @Args('limit', { type: () => Int, nullable: true, defaultValue: 100 }) limit?: number,
        @Args('pulseOnly', { type: () => Boolean, nullable: true, defaultValue: false }) pulseOnly?: boolean,
    ) {
        return this.svc.listRuns({ tenantId, routineId, agentId, status, limit, pulseOnly });
    }

    @Query(() => [AosRunQueueItem])
    aosRunQueue(@Args('tenantId', optStr) tenantId?: string) {
        return this.svc.listRunQueue(tenantId);
    }

    @Query(() => [AosWorkflow])
    aosWorkflows(
        @Args('tenantId', optStr) tenantId?: string,
        @Args('includeArchived', archivedArg) includeArchived?: boolean,
    ) {
        return this.svc.listWorkflows(tenantId, includeArchived);
    }

    /** Newest first. */
    @Query(() => [AosWorkflowRun])
    aosWorkflowRuns(
        @Args('tenantId', optStr) tenantId?: string,
        @Args('workflowId', optStr) workflowId?: string,
        @Args('status', optStr) status?: string,
        @Args('limit', { type: () => Int, nullable: true, defaultValue: 50 }) limit?: number,
    ) {
        return this.workflows.listRuns({ tenantId, workflowId, status, limit });
    }

    @Query(() => AosWorkflowRun, { nullable: true })
    aosWorkflowRun(@Args('id') id: string) {
        return this.workflows.getRun(id);
    }

    /** Problems that would stop the graph from running ([] = valid). */
    @Query(() => [String])
    aosValidateWorkflow(@Args('graph', { type: () => GraphQLJSON }) graph: unknown, @Args('tenantId', optStr) tenantId?: string) {
        return this.workflows.validateGraph(graph, tenantId);
    }

    @Query(() => [AosApproval])
    aosApprovals(@Args('tenantId', optStr) tenantId?: string, @Args('status', optStr) status?: string) {
        return this.svc.listApprovals(tenantId, status);
    }

    @Query(() => [AosAuditEntry])
    aosAudit(
        @Args('tenantId', optStr) tenantId?: string,
        @Args('entity', optStr) entity?: string,
        @Args('entityId', optStr) entityId?: string,
        @Args('actorId', optStr) actorId?: string,
        @Args('since', optStr) since?: string,
        @Args('limit', { type: () => Int, nullable: true, defaultValue: 100 }) limit?: number,
        @Args('level', optStr) level?: string,
        @Args('action', optStr) action?: string,
        @Args('search', optStr) search?: string,
        @Args('until', optStr) until?: string,
    ) {
        return this.svc.listAudit({ tenantId, entity, entityId, actorId, since, until, level, action, search, limit });
    }

    @Query(() => AosPulseStatus)
    aosPulseStatus(@Args('tenantId', optStr) tenantId?: string) {
        return this.pulse.status(tenantId);
    }

    @Query(() => AosCronPreview)
    aosCronPreview(
        @Args('cron') cron: string,
        @Args('timezone', { type: () => String, nullable: true, defaultValue: 'Asia/Jakarta' }) timezone?: string,
        @Args('count', { type: () => Int, nullable: true, defaultValue: 5 }) count?: number,
    ) {
        return this.svc.cronPreview(cron, timezone, count);
    }

    @Query(() => AosSettings)
    aosSettings(@Args('tenantId', optStr) tenantId?: string) {
        return this.svc.getSettings(tenantId);
    }

    @Query(() => AosStats)
    aosStats(@Args('tenantId', optStr) tenantId?: string) {
        return this.svc.getStats(tenantId);
    }

    // ════════════════════════════════════════════════════════════════════════
    // Mutations (guarded + audited)
    // ════════════════════════════════════════════════════════════════════════

    // ── Agents ───────────────────────────────────────────────────────────────

    @Mutation(() => AosAgent)
    @UseGuards(AosAuthGuard)
    aosCreateAgent(
        @Args('tenantId', optStr) tenantId: string | undefined,
        @Args('input', { type: () => AosAgentInput }) input: AosAgentInput,
        @Context() ctx: AosContext,
    ) {
        return this.svc.createAgent(tenantId, input, actorOf(ctx));
    }

    @Mutation(() => AosAgent)
    @UseGuards(AosAuthGuard)
    aosUpdateAgent(
        @Args('id') id: string,
        @Args('input', { type: () => AosAgentInput }) input: AosAgentInput,
        @Args('changeNote', optStr) changeNote: string | undefined,
        @Context() ctx: AosContext,
    ) {
        return this.svc.updateAgent(id, input, changeNote, actorOf(ctx));
    }

    @Mutation(() => AosAgent)
    @UseGuards(AosAuthGuard)
    aosCloneAgent(@Args('id') id: string, @Args('name', optStr) name: string | undefined, @Context() ctx: AosContext) {
        return this.svc.cloneAgent(id, name, actorOf(ctx));
    }

    @Mutation(() => AosAgent)
    @UseGuards(AosAuthGuard)
    aosArchiveAgent(@Args('id') id: string, @Context() ctx: AosContext) {
        return this.svc.setAgentArchived(id, true, actorOf(ctx));
    }

    @Mutation(() => AosAgent)
    @UseGuards(AosAuthGuard)
    aosRestoreAgent(@Args('id') id: string, @Context() ctx: AosContext) {
        return this.svc.setAgentArchived(id, false, actorOf(ctx));
    }

    @Mutation(() => AosAgent)
    @UseGuards(AosAuthGuard)
    aosRestoreAgentVersion(
        @Args('agentId') agentId: string,
        @Args('version', { type: () => Int }) version: number,
        @Context() ctx: AosContext,
    ) {
        return this.svc.restoreAgentVersion(agentId, version, actorOf(ctx));
    }

    // ── Playbooks ────────────────────────────────────────────────────────────

    @Mutation(() => AosPlaybook)
    @UseGuards(AosAuthGuard)
    aosCreatePlaybook(
        @Args('tenantId', optStr) tenantId: string | undefined,
        @Args('input', { type: () => AosPlaybookInput }) input: AosPlaybookInput,
        @Context() ctx: AosContext,
    ) {
        return this.svc.createPlaybook(tenantId, input, actorOf(ctx));
    }

    @Mutation(() => AosPlaybook)
    @UseGuards(AosAuthGuard)
    aosUpdatePlaybook(
        @Args('id') id: string,
        @Args('input', { type: () => AosPlaybookInput }) input: AosPlaybookInput,
        @Context() ctx: AosContext,
    ) {
        return this.svc.updatePlaybook(id, input, actorOf(ctx));
    }

    @Mutation(() => AosPlaybook)
    @UseGuards(AosAuthGuard)
    aosArchivePlaybook(@Args('id') id: string, @Context() ctx: AosContext) {
        return this.svc.setPlaybookArchived(id, true, actorOf(ctx));
    }

    @Mutation(() => AosPlaybook)
    @UseGuards(AosAuthGuard)
    aosRestorePlaybook(@Args('id') id: string, @Context() ctx: AosContext) {
        return this.svc.setPlaybookArchived(id, false, actorOf(ctx));
    }

    // ── Tasks ────────────────────────────────────────────────────────────────

    @Mutation(() => AosTask)
    @UseGuards(AosAuthGuard)
    aosCreateTask(
        @Args('tenantId', optStr) tenantId: string | undefined,
        @Args('input', { type: () => AosTaskInput }) input: AosTaskInput,
        @Context() ctx: AosContext,
    ) {
        return this.svc.createTask(tenantId, input, actorOf(ctx));
    }

    @Mutation(() => AosTask)
    @UseGuards(AosAuthGuard)
    aosUpdateTask(
        @Args('id') id: string,
        @Args('input', { type: () => AosTaskInput }) input: AosTaskInput,
        @Context() ctx: AosContext,
    ) {
        return this.svc.updateTask(id, input, actorOf(ctx));
    }

    @Mutation(() => Boolean)
    @UseGuards(AosAuthGuard)
    aosReorderTasks(@Args('ids', { type: () => [String] }) ids: string[], @Context() ctx: AosContext) {
        return this.svc.reorderTasks(ids, actorOf(ctx));
    }

    @Mutation(() => AosTask)
    @UseGuards(AosAuthGuard)
    aosCompleteTask(@Args('id') id: string, @Context() ctx: AosContext) {
        return this.svc.completeTask(id, actorOf(ctx));
    }

    @Mutation(() => AosTask)
    @UseGuards(AosAuthGuard)
    aosCancelTask(@Args('id') id: string, @Context() ctx: AosContext) {
        return this.svc.cancelTask(id, actorOf(ctx));
    }

    @Mutation(() => AosTask)
    @UseGuards(AosAuthGuard)
    aosRetryTask(@Args('id') id: string, @Context() ctx: AosContext) {
        return this.svc.retryTask(id, actorOf(ctx));
    }

    @Mutation(() => AosTask)
    @UseGuards(AosAuthGuard)
    aosArchiveTask(@Args('id') id: string, @Context() ctx: AosContext) {
        return this.svc.archiveTask(id, actorOf(ctx));
    }

    // ── Memory ───────────────────────────────────────────────────────────────

    @Mutation(() => AosMemoryArea)
    @UseGuards(AosAuthGuard)
    aosCreateMemoryArea(
        @Args('tenantId', optStr) tenantId: string | undefined,
        @Args('input', { type: () => AosMemoryAreaInput }) input: AosMemoryAreaInput,
        @Context() ctx: AosContext,
    ) {
        return this.svc.createMemoryArea(tenantId, input, actorOf(ctx));
    }

    @Mutation(() => AosMemoryArea)
    @UseGuards(AosAuthGuard)
    aosUpdateMemoryArea(
        @Args('id') id: string,
        @Args('input', { type: () => AosMemoryAreaInput }) input: AosMemoryAreaInput,
        @Context() ctx: AosContext,
    ) {
        return this.svc.updateMemoryArea(id, input, actorOf(ctx));
    }

    @Mutation(() => AosMemoryArea)
    @UseGuards(AosAuthGuard)
    aosArchiveMemoryArea(@Args('id') id: string, @Context() ctx: AosContext) {
        return this.svc.setMemoryAreaArchived(id, true, actorOf(ctx));
    }

    @Mutation(() => AosMemoryArea)
    @UseGuards(AosAuthGuard)
    aosRestoreMemoryArea(@Args('id') id: string, @Context() ctx: AosContext) {
        return this.svc.setMemoryAreaArchived(id, false, actorOf(ctx));
    }

    @Mutation(() => AosMemoryItem)
    @UseGuards(AosAuthGuard)
    aosCreateMemoryItem(
        @Args('tenantId', optStr) tenantId: string | undefined,
        @Args('input', { type: () => AosMemoryItemInput }) input: AosMemoryItemInput,
        @Context() ctx: AosContext,
    ) {
        return this.svc.createMemoryItem(tenantId, input, actorOf(ctx));
    }

    @Mutation(() => AosMemoryItem)
    @UseGuards(AosAuthGuard)
    aosUpdateMemoryItem(
        @Args('id') id: string,
        @Args('input', { type: () => AosMemoryItemInput }) input: AosMemoryItemInput,
        @Context() ctx: AosContext,
    ) {
        return this.svc.updateMemoryItem(id, input, actorOf(ctx));
    }

    @Mutation(() => AosMemoryItem)
    @UseGuards(AosAuthGuard)
    aosArchiveMemoryItem(@Args('id') id: string, @Context() ctx: AosContext) {
        return this.svc.setMemoryItemArchived(id, true, actorOf(ctx));
    }

    @Mutation(() => AosMemoryItem)
    @UseGuards(AosAuthGuard)
    aosRestoreMemoryItem(@Args('id') id: string, @Context() ctx: AosContext) {
        return this.svc.setMemoryItemArchived(id, false, actorOf(ctx));
    }

    /** A human confirms an item: health ok, last verified now. */
    @Mutation(() => AosMemoryItem)
    @UseGuards(AosAuthGuard)
    aosVerifyMemoryItem(@Args('id') id: string, @Context() ctx: AosContext) {
        return this.svc.verifyMemoryItem(id, actorOf(ctx));
    }

    /** Runs the Memory Map health check now (only the kill switch blocks it). */
    @Mutation(() => AosRun)
    @UseGuards(AosAuthGuard)
    aosRunMemoryCheck(@Context() ctx: AosContext) {
        return this.pulse.runMemoryCheckNow(actorOf(ctx));
    }

    // ── Pulse ────────────────────────────────────────────────────────────────

    @Mutation(() => AosRoutine)
    @UseGuards(AosAuthGuard)
    aosCreateRoutine(
        @Args('tenantId', optStr) tenantId: string | undefined,
        @Args('input', { type: () => AosRoutineInput }) input: AosRoutineInput,
        @Context() ctx: AosContext,
    ) {
        return this.svc.createRoutine(tenantId, input, actorOf(ctx));
    }

    @Mutation(() => AosRoutine)
    @UseGuards(AosAuthGuard)
    aosUpdateRoutine(
        @Args('id') id: string,
        @Args('input', { type: () => AosRoutineInput }) input: AosRoutineInput,
        @Context() ctx: AosContext,
    ) {
        return this.svc.updateRoutine(id, input, actorOf(ctx));
    }

    @Mutation(() => AosRoutine)
    @UseGuards(AosAuthGuard)
    aosArchiveRoutine(@Args('id') id: string, @Context() ctx: AosContext) {
        return this.svc.setRoutineArchived(id, true, actorOf(ctx));
    }

    @Mutation(() => AosRoutine)
    @UseGuards(AosAuthGuard)
    aosRestoreRoutine(@Args('id') id: string, @Context() ctx: AosContext) {
        return this.svc.setRoutineArchived(id, false, actorOf(ctx));
    }

    @Mutation(() => AosRunQueueItem)
    @UseGuards(AosAuthGuard)
    aosQueueRoutine(@Args('routineId') routineId: string, @Context() ctx: AosContext) {
        return this.svc.queueRoutine(routineId, actorOf(ctx));
    }

    /** Synchronous gate + execute; returns the final run (blocked/failed included). */
    @Mutation(() => AosRun)
    @UseGuards(AosAuthGuard)
    aosRunRoutineNow(@Args('routineId') routineId: string, @Context() ctx: AosContext) {
        return this.pulse.runRoutineNow(routineId, actorOf(ctx));
    }

    @Mutation(() => Boolean)
    @UseGuards(AosAuthGuard)
    aosCancelQueued(@Args('id') id: string, @Context() ctx: AosContext) {
        return this.svc.cancelQueued(id, actorOf(ctx));
    }

    /** Playground: one gated LLM call with the agent's persona + scoped memory. */
    @Mutation(() => AosRun)
    @UseGuards(AosAuthGuard)
    aosTestAgent(@Args('agentId') agentId: string, @Args('prompt') prompt: string, @Context() ctx: AosContext) {
        return this.pulse.testAgent(agentId, prompt, actorOf(ctx));
    }

    @Mutation(() => AosRoutine)
    @UseGuards(AosAuthGuard)
    aosSetRoutineEnabled(
        @Args('id') id: string,
        @Args('enabled', { type: () => Boolean }) enabled: boolean,
        @Context() ctx: AosContext,
    ) {
        return this.svc.setRoutineEnabled(id, enabled, actorOf(ctx));
    }

    // ── Workflows ────────────────────────────────────────────────────────────

    @Mutation(() => AosWorkflow)
    @UseGuards(AosAuthGuard)
    aosCreateWorkflow(
        @Args('tenantId', optStr) tenantId: string | undefined,
        @Args('input', { type: () => AosWorkflowInput }) input: AosWorkflowInput,
        @Context() ctx: AosContext,
    ) {
        return this.svc.createWorkflow(tenantId, input, actorOf(ctx));
    }

    @Mutation(() => AosWorkflow)
    @UseGuards(AosAuthGuard)
    aosUpdateWorkflow(
        @Args('id') id: string,
        @Args('input', { type: () => AosWorkflowInput }) input: AosWorkflowInput,
        @Context() ctx: AosContext,
    ) {
        return this.svc.updateWorkflow(id, input, actorOf(ctx));
    }

    @Mutation(() => AosWorkflow)
    @UseGuards(AosAuthGuard)
    aosArchiveWorkflow(@Args('id') id: string, @Context() ctx: AosContext) {
        return this.svc.setWorkflowArchived(id, true, actorOf(ctx));
    }

    @Mutation(() => AosWorkflow)
    @UseGuards(AosAuthGuard)
    aosRestoreWorkflow(@Args('id') id: string, @Context() ctx: AosContext) {
        return this.svc.setWorkflowArchived(id, false, actorOf(ctx));
    }

    /** Starts a run (throws readable errors: disabled, kill switch, invalid graph). */
    @Mutation(() => AosWorkflowRun)
    @UseGuards(AosAuthGuard)
    aosRunWorkflow(@Args('id') id: string, @Context() ctx: AosContext) {
        return this.workflows.startRun(id, 'manual', actorOf(ctx));
    }

    @Mutation(() => AosWorkflowRun)
    @UseGuards(AosAuthGuard)
    aosCancelWorkflowRun(@Args('id') id: string, @Context() ctx: AosContext) {
        return this.workflows.cancelRun(id, actorOf(ctx));
    }

    // ── Governance ───────────────────────────────────────────────────────────

    @Mutation(() => AosApproval)
    @UseGuards(AosAuthGuard)
    aosDecideApproval(
        @Args('id') id: string,
        @Args('approve', { type: () => Boolean }) approve: boolean,
        @Args('comment', optStr) comment: string | undefined,
        @Context() ctx: AosContext,
    ) {
        return this.svc.decideApproval(id, approve, comment, actorOf(ctx));
    }

    @Mutation(() => AosSettings)
    @UseGuards(AosAuthGuard)
    aosUpdateSettings(
        @Args('tenantId', optStr) tenantId: string | undefined,
        @Args('input', { type: () => AosSettingsInput }) input: AosSettingsInput,
        @Context() ctx: AosContext,
    ) {
        return this.svc.updateSettings(tenantId, input, actorOf(ctx));
    }

    @Mutation(() => AosSettings)
    @UseGuards(AosAuthGuard)
    aosSetKillSwitch(
        @Args('tenantId', optStr) tenantId: string | undefined,
        @Args('on', { type: () => Boolean }) on: boolean,
        @Context() ctx: AosContext,
    ) {
        return this.svc.setKillSwitch(tenantId, on, actorOf(ctx));
    }
}
