import { Resolver, Query, Mutation, Args, ObjectType, Field, ID, InputType, Int, Float } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { PmService } from './pm.service';

// ─── GRAPHQL TYPES ───────────────────────────────────────

@ObjectType()
export class PmUserReference {
    @Field(() => ID)
    id: string;

    @Field()
    firstName: string;

    @Field()
    lastName: string;

    @Field({ nullable: true })
    avatarUrl?: string;
}

@ObjectType()
export class PmProject {
    @Field(() => ID)
    id: string;

    @Field()
    projectNumber: string;

    @Field()
    name: string;

    @Field({ nullable: true })
    description?: string;

    @Field()
    status: string;

    @Field()
    priority: string;

    @Field({ nullable: true })
    startDate?: string;

    @Field({ nullable: true })
    endDate?: string;

    @Field(() => Float, { nullable: true })
    budget?: number;

    @Field(() => Float, { nullable: true })
    spent?: number;

    @Field({ nullable: true })
    ownerId?: string;

    @Field(() => PmUserReference, { nullable: true })
    owner?: PmUserReference;

    @Field(() => [String], { nullable: true })
    tags?: string[];

    @Field({ nullable: true })
    methodology?: string;

    @Field({ nullable: true })
    pmbokScopeEnabled?: boolean;

    @Field({ nullable: true })
    pmbokScheduleEnabled?: boolean;

    @Field({ nullable: true })
    pmbokCostEnabled?: boolean;

    @Field({ nullable: true })
    pmbokQualityEnabled?: boolean;

    @Field({ nullable: true })
    pmbokResourceEnabled?: boolean;

    @Field({ nullable: true })
    pmbokCommsEnabled?: boolean;

    @Field({ nullable: true })
    pmbokRiskEnabled?: boolean;

    @Field({ nullable: true })
    pmbokProcurementEnabled?: boolean;

    @Field({ nullable: true })
    pmbokStakeholderEnabled?: boolean;

    @Field()
    createdAt: string;

    @Field()
    updatedAt: string;
}

@ObjectType()
export class PmSprint {
    @Field(() => ID)
    id: string;

    @Field()
    projectId: string;

    @Field()
    name: string;

    @Field({ nullable: true })
    goal?: string;

    @Field()
    status: string;

    @Field({ nullable: true })
    startDate?: string;

    @Field({ nullable: true })
    endDate?: string;

    @Field()
    createdAt: string;

    @Field()
    updatedAt: string;
}

@ObjectType()
export class PmTask {
    @Field(() => ID)
    id: string;

    @Field()
    projectId: string;

    @Field({ nullable: true })
    sprintId?: string;

    @Field({ nullable: true })
    parentTaskId?: string;

    @Field()
    title: string;

    @Field({ nullable: true })
    description?: string;

    @Field()
    status: string;

    @Field()
    priority: string;

    @Field()
    type: string;

    @Field({ nullable: true })
    assigneeId?: string;

    @Field(() => PmUserReference, { nullable: true })
    assignee?: PmUserReference;

    @Field({ nullable: true })
    reporterId?: string;

    @Field(() => Float, { nullable: true })
    estimatedHours?: number;

    @Field(() => Float, { nullable: true })
    loggedHours?: number;

    @Field({ nullable: true })
    startDate?: string;

    @Field({ nullable: true })
    dueDate?: string;

    @Field(() => [String], { nullable: true })
    tags?: string[];

    @Field()
    isArchived: boolean;

    @Field()
    createdAt: string;

    @Field()
    updatedAt: string;
}

@ObjectType()
export class PmTimeLog {
    @Field(() => ID)
    id: string;

    @Field()
    taskId: string;

    @Field()
    userId: string;

    @Field(() => PmUserReference, { nullable: true })
    user?: PmUserReference;

    @Field(() => Float)
    hours: number;

    @Field()
    logDate: string;

    @Field({ nullable: true })
    description?: string;

    @Field()
    createdAt: string;
}

@ObjectType()
export class PmRiskItem {
    @Field() taskTitle: string;
    @Field() reason: string;
}

@ObjectType()
export class PmSprintRiskAnalysis {
    @Field() riskLevel: string;
    @Field(() => Int) riskScore: number;
    @Field() summary: string;
    @Field(() => [PmRiskItem]) identifiedRisks: PmRiskItem[];
    @Field(() => [String]) recommendations: string[];
}

@ObjectType()
export class PmProjectCharter {
    @Field(() => ID) id: string;
    @Field() projectId: string;
    @Field({ nullable: true }) purpose?: string;
    @Field({ nullable: true }) objectives?: string;
    @Field({ nullable: true }) highLevelRequirements?: string;
    @Field({ nullable: true }) highLevelRisks?: string;
    @Field({ nullable: true }) summaryMilestoneSchedule?: string;
    @Field({ nullable: true }) preapprovedFinancialResources?: string;
    @Field({ nullable: true }) keyStakeholders?: string;
    @Field({ nullable: true }) projectApprovalRequirements?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
export class PmRiskRegister {
    @Field(() => ID) id: string;
    @Field() projectId: string;
    @Field() riskName: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) category?: string;
    @Field(() => Int) probability: number;
    @Field(() => Int) impact: number;
    @Field(() => Int) riskScore: number;
    @Field({ nullable: true }) mitigationStrategy?: string;
    @Field({ nullable: true }) contingencyPlan?: string;
    @Field() status: string;
    @Field({ nullable: true }) ownerId?: string;
    @Field(() => PmUserReference, { nullable: true }) owner?: PmUserReference;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
export class PmEarnedValue {
    @Field(() => ID) id: string;
    @Field() projectId: string;
    @Field() snapshotDate: string;
    @Field(() => Float) plannedValue: number;
    @Field(() => Float) earnedValue: number;
    @Field(() => Float) actualCost: number;
    @Field(() => Float, { nullable: true }) scheduleVariance?: number;
    @Field(() => Float, { nullable: true }) costVariance?: number;
    @Field(() => Float, { nullable: true }) schedulePerformanceIndex?: number;
    @Field(() => Float, { nullable: true }) costPerformanceIndex?: number;
    @Field() createdAt: string;
}

// ─── INPUT TYPES ─────────────────────────────────────────

@InputType()
export class CreatePmProjectInput {
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) startDate?: string;
    @Field({ nullable: true }) endDate?: string;
    @Field(() => Float, { nullable: true }) budget?: number;
    @Field({ nullable: true }) ownerId?: string;
    @Field(() => [String], { nullable: true }) tags?: string[];

    @Field({ nullable: true }) methodology?: string;
    @Field({ nullable: true }) pmbokScopeEnabled?: boolean;
    @Field({ nullable: true }) pmbokScheduleEnabled?: boolean;
    @Field({ nullable: true }) pmbokCostEnabled?: boolean;
    @Field({ nullable: true }) pmbokQualityEnabled?: boolean;
    @Field({ nullable: true }) pmbokResourceEnabled?: boolean;
    @Field({ nullable: true }) pmbokCommsEnabled?: boolean;
    @Field({ nullable: true }) pmbokRiskEnabled?: boolean;
    @Field({ nullable: true }) pmbokProcurementEnabled?: boolean;
    @Field({ nullable: true }) pmbokStakeholderEnabled?: boolean;
}

@InputType()
export class UpdatePmProjectInput {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) startDate?: string;
    @Field({ nullable: true }) endDate?: string;
    @Field(() => Float, { nullable: true }) budget?: number;
    @Field(() => Float, { nullable: true }) spent?: number;
    @Field({ nullable: true }) ownerId?: string;
    @Field(() => [String], { nullable: true }) tags?: string[];

    @Field({ nullable: true }) methodology?: string;
    @Field({ nullable: true }) pmbokScopeEnabled?: boolean;
    @Field({ nullable: true }) pmbokScheduleEnabled?: boolean;
    @Field({ nullable: true }) pmbokCostEnabled?: boolean;
    @Field({ nullable: true }) pmbokQualityEnabled?: boolean;
    @Field({ nullable: true }) pmbokResourceEnabled?: boolean;
    @Field({ nullable: true }) pmbokCommsEnabled?: boolean;
    @Field({ nullable: true }) pmbokRiskEnabled?: boolean;
    @Field({ nullable: true }) pmbokProcurementEnabled?: boolean;
    @Field({ nullable: true }) pmbokStakeholderEnabled?: boolean;
}

@InputType()
export class CreatePmSprintInput {
    @Field() projectId: string;
    @Field() name: string;
    @Field({ nullable: true }) goal?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) startDate?: string;
    @Field({ nullable: true }) endDate?: string;
}

@InputType()
export class UpdatePmSprintInput {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) goal?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) startDate?: string;
    @Field({ nullable: true }) endDate?: string;
}

@InputType()
export class CreatePmTaskInput {
    @Field() projectId: string;
    @Field({ nullable: true }) sprintId?: string;
    @Field({ nullable: true }) parentTaskId?: string;
    @Field() title: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) type?: string;
    @Field({ nullable: true }) assigneeId?: string;
    @Field({ nullable: true }) reporterId?: string;
    @Field(() => Float, { nullable: true }) estimatedHours?: number;
    @Field({ nullable: true }) dueDate?: string;
    @Field(() => [String], { nullable: true }) tags?: string[];
}

@InputType()
export class UpdatePmTaskInput {
    @Field({ nullable: true }) sprintId?: string;
    @Field({ nullable: true }) parentTaskId?: string;
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) type?: string;
    @Field({ nullable: true }) assigneeId?: string;
    @Field(() => Float, { nullable: true }) estimatedHours?: number;
    @Field({ nullable: true }) dueDate?: string;
    @Field(() => [String], { nullable: true }) tags?: string[];
    @Field({ nullable: true }) isArchived?: boolean;
}

@InputType()
export class CreatePmTimeLogInput {
    @Field() taskId: string;
    @Field() userId: string;
    @Field(() => Float) hours: number;
    @Field() logDate: string;
    @Field({ nullable: true }) description?: string;
}

@InputType()
export class UpsertPmProjectCharterInput {
    @Field({ nullable: true }) purpose?: string;
    @Field({ nullable: true }) objectives?: string;
    @Field({ nullable: true }) highLevelRequirements?: string;
    @Field({ nullable: true }) highLevelRisks?: string;
    @Field({ nullable: true }) summaryMilestoneSchedule?: string;
    @Field({ nullable: true }) preapprovedFinancialResources?: string;
    @Field({ nullable: true }) keyStakeholders?: string;
    @Field({ nullable: true }) projectApprovalRequirements?: string;
}

@InputType()
export class CreatePmRiskRegisterInput {
    @Field() projectId: string;
    @Field() riskName: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) category?: string;
    @Field(() => Int, { nullable: true }) probability?: number;
    @Field(() => Int, { nullable: true }) impact?: number;
    @Field({ nullable: true }) mitigationStrategy?: string;
    @Field({ nullable: true }) contingencyPlan?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) ownerId?: string;
}

@InputType()
export class UpdatePmRiskRegisterInput {
    @Field({ nullable: true }) riskName?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) category?: string;
    @Field(() => Int, { nullable: true }) probability?: number;
    @Field(() => Int, { nullable: true }) impact?: number;
    @Field({ nullable: true }) mitigationStrategy?: string;
    @Field({ nullable: true }) contingencyPlan?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) ownerId?: string;
}

// ─── MAPPERS ─────────────────────────────────────────────

function mapUserRef(row: any): PmUserReference | undefined {
    if (!row) return undefined;
    const ref = row.individuals || row.users;
    return {
        id: row.id,
        firstName: ref?.first_name || '',
        lastName: ref?.last_name || '',
        avatarUrl: ref?.avatar_url,
    };
}

function mapProject(row: any): PmProject {
    return {
        id: row.id,
        projectNumber: row.project_number,
        name: row.name,
        description: row.description,
        status: row.status,
        priority: row.priority,
        startDate: row.start_date,
        endDate: row.end_date,
        budget: row.budget,
        spent: row.spent,
        ownerId: row.owner_id,
        owner: mapUserRef(row.owner),
        tags: row.tags,
        methodology: row.methodology,
        pmbokScopeEnabled: row.pmbok_scope_enabled,
        pmbokScheduleEnabled: row.pmbok_schedule_enabled,
        pmbokCostEnabled: row.pmbok_cost_enabled,
        pmbokQualityEnabled: row.pmbok_quality_enabled,
        pmbokResourceEnabled: row.pmbok_resource_enabled,
        pmbokCommsEnabled: row.pmbok_comms_enabled,
        pmbokRiskEnabled: row.pmbok_risk_enabled,
        pmbokProcurementEnabled: row.pmbok_procurement_enabled,
        pmbokStakeholderEnabled: row.pmbok_stakeholder_enabled,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapSprint(row: any): PmSprint {
    return {
        id: row.id,
        projectId: row.project_id,
        name: row.name,
        goal: row.goal,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapTask(row: any): PmTask {
    return {
        id: row.id,
        projectId: row.project_id,
        sprintId: row.sprint_id,
        parentTaskId: row.parent_task_id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        type: row.type,
        assigneeId: row.assignee_id,
        assignee: mapUserRef(row.assignee),
        reporterId: row.reporter_id,
        estimatedHours: row.estimated_hours,
        loggedHours: row.logged_hours,
        startDate: row.start_date,
        dueDate: row.due_date,
        tags: row.tags,
        isArchived: row.is_archived,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapTimeLog(row: any): PmTimeLog {
    return {
        id: row.id,
        taskId: row.task_id,
        userId: row.user_id,
        user: mapUserRef(row.user),
        hours: row.hours,
        logDate: row.log_date,
        description: row.description,
        createdAt: row.created_at,
    };
}

function mapProjectCharter(row: any): PmProjectCharter {
    return {
        id: row.id,
        projectId: row.project_id,
        purpose: row.purpose,
        objectives: row.objectives,
        highLevelRequirements: row.high_level_requirements,
        highLevelRisks: row.high_level_risks,
        summaryMilestoneSchedule: row.summary_milestone_schedule,
        preapprovedFinancialResources: row.preapproved_financial_resources,
        keyStakeholders: row.key_stakeholders,
        projectApprovalRequirements: row.project_approval_requirements,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapRiskRegister(row: any): PmRiskRegister {
    return {
        id: row.id,
        projectId: row.project_id,
        riskName: row.risk_name,
        description: row.description,
        category: row.category,
        probability: row.probability || 1,
        impact: row.impact || 1,
        riskScore: row.risk_score || 1,
        mitigationStrategy: row.mitigation_strategy,
        contingencyPlan: row.contingency_plan,
        status: row.status,
        ownerId: row.owner_id,
        owner: mapUserRef(row.owner),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapEarnedValue(row: any): PmEarnedValue {
    return {
        id: row.id,
        projectId: row.project_id,
        snapshotDate: row.snapshot_date,
        plannedValue: row.planned_value,
        earnedValue: row.earned_value,
        actualCost: row.actual_cost,
        scheduleVariance: row.schedule_variance,
        costVariance: row.cost_variance,
        schedulePerformanceIndex: row.schedule_performance_index,
        costPerformanceIndex: row.cost_performance_index,
        createdAt: row.created_at,
    };
}

// ─── RESOLVER ────────────────────────────────────────────

@Resolver()
export class PmResolver {
    constructor(private readonly pmService: PmService) { }

    // -- PROJECTS --
    @Query(() => [PmProject])
    async pmProjects(
        @Args('tenantId') tenantId: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        const rows = await this.pmService.getProjects(tenantId, { status, search });
        return (rows || []).map(mapProject);
    }

    @Query(() => PmProject)
    async pmProject(@Args('id', { type: () => ID }) id: string) {
        const row = await this.pmService.getProject(id);
        return mapProject(row);
    }

    @Mutation(() => PmProject)
    async createPmProject(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreatePmProjectInput,
    ) {
        const row = await this.pmService.createProject(tenantId, input);
        return mapProject(row);
    }

    @Mutation(() => PmProject)
    async updatePmProject(
        @Args('id', { type: () => ID }) id: string,
        @Args('input') input: UpdatePmProjectInput,
    ) {
        const row = await this.pmService.updateProject(id, input);
        return mapProject(row);
    }

    @Mutation(() => Boolean)
    async deletePmProject(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteProject(id);
    }

    // -- SPRINTS --
    @Query(() => [PmSprint])
    async pmSprints(@Args('projectId') projectId: string) {
        const rows = await this.pmService.getSprints(projectId);
        return (rows || []).map(mapSprint);
    }

    @Mutation(() => PmSprint)
    async createPmSprint(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreatePmSprintInput,
    ) {
        const row = await this.pmService.createSprint(tenantId, input);
        return mapSprint(row);
    }

    @Mutation(() => PmSprint)
    async updatePmSprint(
        @Args('id', { type: () => ID }) id: string,
        @Args('input') input: UpdatePmSprintInput,
    ) {
        const row = await this.pmService.updateSprint(id, input);
        return mapSprint(row);
    }

    @Mutation(() => Boolean)
    async deletePmSprint(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteSprint(id);
    }

    // -- TASKS --
    @Query(() => [PmTask])
    async pmTasks(
        @Args('tenantId') tenantId: string,
        @Args('projectId', { nullable: true }) projectId?: string,
        @Args('sprintId', { nullable: true }) sprintId?: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('assigneeId', { nullable: true }) assigneeId?: string,
    ) {
        const rows = await this.pmService.getTasks(tenantId, { projectId, sprintId, status, assigneeId });
        return (rows || []).map(mapTask);
    }

    @Query(() => PmTask)
    async pmTask(@Args('id', { type: () => ID }) id: string) {
        const row = await this.pmService.getTask(id);
        return mapTask(row);
    }

    @Mutation(() => PmTask)
    async createPmTask(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreatePmTaskInput,
    ) {
        const row = await this.pmService.createTask(tenantId, input);
        return mapTask(row);
    }

    @Mutation(() => PmTask)
    async updatePmTask(
        @Args('id', { type: () => ID }) id: string,
        @Args('input') input: UpdatePmTaskInput,
    ) {
        const row = await this.pmService.updateTask(id, input);
        // Note: we might want to return the updated record with relations if possible, but basic mapping works.
        return mapTask(row);
    }

    @Mutation(() => Boolean)
    async deletePmTask(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteTask(id);
    }

    // -- TIME LOGS --
    @Query(() => [PmTimeLog])
    async pmTimeLogs(@Args('taskId') taskId: string) {
        const rows = await this.pmService.getTimeLogs(taskId);
        return (rows || []).map(mapTimeLog);
    }

    @Mutation(() => PmTimeLog)
    async logPmTime(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreatePmTimeLogInput,
    ) {
        const row = await this.pmService.logTime(tenantId, input);
        return mapTimeLog(row);
    }

    @Mutation(() => Boolean)
    async deletePmTimeLog(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteTimeLog(id);
    }

    // -- AI INTEGRATION --

    @Query(() => String)
    async generatePmTaskDescription(
        @Args('title') title: string,
        @Args('context', { nullable: true }) context?: string,
    ) {
        return this.pmService.generateTaskDescription(title, context);
    }

    @Query(() => PmSprintRiskAnalysis)
    async analyzePmSprintRisk(@Args('sprintId') sprintId: string) {
        return this.pmService.analyzeSprintRisk(sprintId);
    }

    @Query(() => String)
    async generatePmSprintRetrospective(@Args('sprintId') sprintId: string) {
        return this.pmService.generateSprintRetrospective(sprintId);
    }

    // -- PMBOK 6 ENTITIES --

    @Query(() => PmProjectCharter, { nullable: true })
    async pmProjectCharter(@Args('projectId') projectId: string) {
        const row = await this.pmService.getProjectCharter(projectId);
        if (!row) return null;
        return mapProjectCharter(row);
    }

    @Mutation(() => PmProjectCharter)
    async upsertPmProjectCharter(
        @Args('projectId') projectId: string,
        @Args('tenantId') tenantId: string,
        @Args('input') input: UpsertPmProjectCharterInput,
    ) {
        const row = await this.pmService.upsertProjectCharter(projectId, tenantId, input);
        return mapProjectCharter(row);
    }

    @Query(() => [PmRiskRegister])
    async pmRiskRegisters(@Args('projectId') projectId: string) {
        const rows = await this.pmService.getRiskRegisters(projectId);
        return (rows || []).map(mapRiskRegister);
    }

    @Mutation(() => PmRiskRegister)
    async createPmRiskRegister(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreatePmRiskRegisterInput,
    ) {
        const row = await this.pmService.createRiskRegister(tenantId, input);
        return mapRiskRegister(row);
    }

    @Mutation(() => PmRiskRegister)
    async updatePmRiskRegister(
        @Args('id', { type: () => ID }) id: string,
        @Args('input') input: UpdatePmRiskRegisterInput,
    ) {
        const row = await this.pmService.updateRiskRegister(id, input);
        return mapRiskRegister(row);
    }

    @Mutation(() => Boolean)
    async deletePmRiskRegister(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteRiskRegister(id);
    }

    @Query(() => [PmEarnedValue])
    async pmEarnedValues(@Args('projectId') projectId: string) {
        const rows = await this.pmService.getEarnedValues(projectId);
        return (rows || []).map(mapEarnedValue);
    }

    // -- AI GENERATORS --

    @Query(() => GraphQLJSON)
    async generateProjectCharter(@Args('projectId') projectId: string) {
        return this.pmService.generateProjectCharter(projectId);
    }

    @Query(() => GraphQLJSON)
    async generateRiskRegister(@Args('projectId') projectId: string) {
        return this.pmService.generateRiskRegister(projectId);
    }

    @Mutation(() => PmEarnedValue)
    async generateEarnedValueMetrics(
        @Args('projectId') projectId: string,
        @Args('tenantId') tenantId: string
    ) {
        const row = await this.pmService.generateEarnedValueMetrics(projectId, tenantId);
        return mapEarnedValue(row); // Use the same mapper we defined earlier
    }
}
