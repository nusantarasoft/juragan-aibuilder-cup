import {
    Resolver, Query, Mutation, Args,
    ObjectType, Field, ID, InputType, Float, Int,
} from '@nestjs/graphql';
import { OpsService } from './ops.service';
import GraphQLJSON from 'graphql-type-json';

// ─── Types ──────────────────────────────────────────────

@ObjectType()
class OpsPlaybook {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
    @Field() category: string;
    @Field() priority: string;
    @Field() estimatedMinutes: number;
    @Field(() => [String]) tags: string[];
    @Field() isActive: boolean;
    @Field({ nullable: true }) createdBy?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class OpsPlaybookStep {
    @Field(() => ID) id: string;
    @Field() playbookId: string;
    @Field() stepOrder: number;
    @Field() title: string;
    @Field({ nullable: true }) description?: string;
    @Field() stepType: string;
    @Field() isRequired: boolean;
    @Field({ nullable: true }) defaultAssigneeId?: string;
    @Field() estimatedMinutes: number;
    @Field() createdAt: string;
}

@ObjectType()
class OpsRun {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() playbookId: string;
    @Field() name: string;
    @Field() status: string;
    @Field({ nullable: true }) startedBy?: string;
    @Field({ nullable: true }) startedAt?: string;
    @Field({ nullable: true }) completedAt?: string;
    @Field({ nullable: true }) dueAt?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) scheduleId?: string;
    @Field({ nullable: true }) playbookName?: string;
    @Field({ nullable: true }) playbookCategory?: string;
    @Field({ nullable: true }) playbookPriority?: string;
    @Field() createdAt: string;
}

@ObjectType()
class OpsRunStep {
    @Field(() => ID) id: string;
    @Field() runId: string;
    @Field() stepId: string;
    @Field() stepOrder: number;
    @Field() title: string;
    @Field() status: string;
    @Field({ nullable: true }) assigneeId?: string;
    @Field({ nullable: true }) assigneeName?: string;
    @Field({ nullable: true }) startedAt?: string;
    @Field({ nullable: true }) completedAt?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) completedBy?: string;
    @Field() createdAt: string;
}

@ObjectType()
class OpsSchedule {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() playbookId: string;
    @Field() name: string;
    @Field() cronExpression: string;
    @Field() timezone: string;
    @Field() isActive: boolean;
    @Field({ nullable: true }) nextRunAt?: string;
    @Field({ nullable: true }) lastRunAt?: string;
    @Field({ nullable: true }) autoAssignTo?: string;
    @Field({ nullable: true }) createdBy?: string;
    @Field({ nullable: true }) playbookName?: string;
    @Field({ nullable: true }) playbookCategory?: string;
    @Field() createdAt: string;
}

// ─── Mappers ────────────────────────────────────────────

function mapPlaybook(d: any): OpsPlaybook {
    return {
        id: d.id, tenantId: d.tenant_id, name: d.name,
        description: d.description, category: d.category,
        priority: d.priority, estimatedMinutes: d.estimated_minutes || 0,
        tags: d.tags || [], isActive: d.is_active,
        createdBy: d.created_by, createdAt: d.created_at, updatedAt: d.updated_at,
    };
}

function mapStep(d: any): OpsPlaybookStep {
    return {
        id: d.id, playbookId: d.playbook_id, stepOrder: d.step_order,
        title: d.title, description: d.description,
        stepType: d.step_type, isRequired: d.is_required,
        defaultAssigneeId: d.default_assignee_id,
        estimatedMinutes: d.estimated_minutes || 0, createdAt: d.created_at,
    };
}

function mapRun(d: any): OpsRun {
    return {
        id: d.id, tenantId: d.tenant_id, playbookId: d.playbook_id,
        name: d.name, status: d.status, startedBy: d.started_by,
        startedAt: d.started_at, completedAt: d.completed_at,
        dueAt: d.due_at, notes: d.notes, scheduleId: d.schedule_id,
        playbookName: d.ops_playbooks?.name,
        playbookCategory: d.ops_playbooks?.category,
        playbookPriority: d.ops_playbooks?.priority,
        createdAt: d.created_at,
    };
}

function mapRunStep(d: any): OpsRunStep {
    return {
        id: d.id, runId: d.run_id, stepId: d.step_id,
        stepOrder: d.step_order, title: d.title, status: d.status,
        assigneeId: d.assignee_id, assigneeName: d.assignee_name,
        startedAt: d.started_at, completedAt: d.completed_at,
        notes: d.notes, completedBy: d.completed_by, createdAt: d.created_at,
    };
}

function mapSchedule(d: any): OpsSchedule {
    return {
        id: d.id, tenantId: d.tenant_id, playbookId: d.playbook_id,
        name: d.name, cronExpression: d.cron_expression,
        timezone: d.timezone, isActive: d.is_active,
        nextRunAt: d.next_run_at, lastRunAt: d.last_run_at,
        autoAssignTo: d.auto_assign_to, createdBy: d.created_by,
        playbookName: d.ops_playbooks?.name,
        playbookCategory: d.ops_playbooks?.category,
        createdAt: d.created_at,
    };
}

// ─── Resolver ───────────────────────────────────────────

@Resolver()
export class OpsResolver {
    constructor(private opsService: OpsService) {}

    // Playbooks
    @Query(() => [OpsPlaybook])
    async opsPlaybooks(@Args('tenantId') tenantId: string) {
        const data = await this.opsService.getPlaybooks(tenantId);
        return data.map(mapPlaybook);
    }

    @Query(() => OpsPlaybook)
    async opsPlaybook(@Args('id') id: string) {
        return mapPlaybook(await this.opsService.getPlaybook(id));
    }

    @Mutation(() => OpsPlaybook)
    async createOpsPlaybook(
        @Args('tenantId') tenantId: string,
        @Args('name') name: string,
        @Args('description', { nullable: true }) description?: string,
        @Args('category', { nullable: true }) category?: string,
        @Args('priority', { nullable: true }) priority?: string,
        @Args('estimatedMinutes', { nullable: true }) estimatedMinutes?: number,
        @Args('createdBy', { nullable: true }) createdBy?: string,
    ) {
        return mapPlaybook(await this.opsService.createPlaybook(tenantId, {
            name, description, category, priority, estimatedMinutes, createdBy,
        }));
    }

    @Mutation(() => OpsPlaybook)
    async updateOpsPlaybook(
        @Args('id') id: string,
        @Args('name', { nullable: true }) name?: string,
        @Args('description', { nullable: true }) description?: string,
        @Args('category', { nullable: true }) category?: string,
        @Args('priority', { nullable: true }) priority?: string,
        @Args('estimatedMinutes', { nullable: true }) estimatedMinutes?: number,
        @Args('isActive', { nullable: true }) isActive?: boolean,
    ) {
        return mapPlaybook(await this.opsService.updatePlaybook(id, {
            name, description, category, priority, estimatedMinutes, isActive,
        }));
    }

    @Mutation(() => Boolean)
    async deleteOpsPlaybook(@Args('id') id: string) {
        return this.opsService.deletePlaybook(id);
    }

    // Steps
    @Query(() => [OpsPlaybookStep])
    async opsPlaybookSteps(@Args('playbookId') playbookId: string) {
        return (await this.opsService.getPlaybookSteps(playbookId)).map(mapStep);
    }

    @Mutation(() => OpsPlaybookStep)
    async createOpsPlaybookStep(
        @Args('playbookId') playbookId: string,
        @Args('title') title: string,
        @Args('stepOrder', { nullable: true }) stepOrder?: number,
        @Args('description', { nullable: true }) description?: string,
        @Args('stepType', { nullable: true }) stepType?: string,
        @Args('isRequired', { nullable: true }) isRequired?: boolean,
        @Args('defaultAssigneeId', { nullable: true }) defaultAssigneeId?: string,
        @Args('estimatedMinutes', { nullable: true }) estimatedMinutes?: number,
    ) {
        return mapStep(await this.opsService.createPlaybookStep(playbookId, {
            title, stepOrder, description, stepType, isRequired,
            defaultAssigneeId, estimatedMinutes,
        }));
    }

    @Mutation(() => OpsPlaybookStep)
    async updateOpsPlaybookStep(
        @Args('id') id: string,
        @Args('title', { nullable: true }) title?: string,
        @Args('description', { nullable: true }) description?: string,
        @Args('stepOrder', { nullable: true }) stepOrder?: number,
        @Args('stepType', { nullable: true }) stepType?: string,
        @Args('isRequired', { nullable: true }) isRequired?: boolean,
        @Args('defaultAssigneeId', { nullable: true }) defaultAssigneeId?: string,
        @Args('estimatedMinutes', { nullable: true }) estimatedMinutes?: number,
    ) {
        return mapStep(await this.opsService.updatePlaybookStep(id, {
            title, description, stepOrder, stepType, isRequired,
            defaultAssigneeId, estimatedMinutes,
        }));
    }

    @Mutation(() => Boolean)
    async deleteOpsPlaybookStep(@Args('id') id: string) {
        return this.opsService.deletePlaybookStep(id);
    }

    // Runs
    @Query(() => [OpsRun])
    async opsRuns(
        @Args('tenantId') tenantId: string,
        @Args('status', { nullable: true }) status?: string,
    ) {
        return (await this.opsService.getRuns(tenantId, status)).map(mapRun);
    }

    @Query(() => OpsRun)
    async opsRun(@Args('id') id: string) {
        return mapRun(await this.opsService.getRun(id));
    }

    @Mutation(() => OpsRun)
    async createOpsRun(
        @Args('tenantId') tenantId: string,
        @Args('playbookId') playbookId: string,
        @Args('name') name: string,
        @Args('startedBy', { nullable: true }) startedBy?: string,
        @Args('dueAt', { nullable: true }) dueAt?: string,
        @Args('notes', { nullable: true }) notes?: string,
    ) {
        return mapRun(await this.opsService.createRun(tenantId, {
            playbookId, name, startedBy, dueAt, notes,
        }));
    }

    @Mutation(() => OpsRun)
    async updateOpsRunStatus(
        @Args('id') id: string,
        @Args('status') status: string,
    ) {
        return mapRun(await this.opsService.updateRunStatus(id, status));
    }

    @Mutation(() => Boolean)
    async deleteOpsRun(@Args('id') id: string) {
        return this.opsService.deleteRun(id);
    }

    // Run Steps
    @Query(() => [OpsRunStep])
    async opsRunSteps(@Args('runId') runId: string) {
        return (await this.opsService.getRunSteps(runId)).map(mapRunStep);
    }

    @Mutation(() => OpsRunStep)
    async updateOpsRunStepStatus(
        @Args('id') id: string,
        @Args('status') status: string,
        @Args('completedBy', { nullable: true }) completedBy?: string,
        @Args('notes', { nullable: true }) notes?: string,
    ) {
        return mapRunStep(await this.opsService.updateRunStepStatus(id, status, completedBy, notes));
    }

    @Mutation(() => OpsRunStep)
    async assignOpsRunStep(
        @Args('id') id: string,
        @Args('assigneeId') assigneeId: string,
        @Args('assigneeName', { nullable: true }) assigneeName?: string,
    ) {
        return mapRunStep(await this.opsService.assignRunStep(id, assigneeId, assigneeName));
    }

    // Schedules
    @Query(() => [OpsSchedule])
    async opsSchedules(@Args('tenantId') tenantId: string) {
        return (await this.opsService.getSchedules(tenantId)).map(mapSchedule);
    }

    @Mutation(() => OpsSchedule)
    async createOpsSchedule(
        @Args('tenantId') tenantId: string,
        @Args('playbookId') playbookId: string,
        @Args('name') name: string,
        @Args('cronExpression') cronExpression: string,
        @Args('timezone', { nullable: true }) timezone?: string,
        @Args('autoAssignTo', { nullable: true }) autoAssignTo?: string,
        @Args('createdBy', { nullable: true }) createdBy?: string,
    ) {
        return mapSchedule(await this.opsService.createSchedule(tenantId, {
            playbookId, name, cronExpression, timezone, autoAssignTo, createdBy,
        }));
    }

    @Mutation(() => OpsSchedule)
    async updateOpsSchedule(
        @Args('id') id: string,
        @Args('name', { nullable: true }) name?: string,
        @Args('cronExpression', { nullable: true }) cronExpression?: string,
        @Args('timezone', { nullable: true }) timezone?: string,
        @Args('isActive', { nullable: true }) isActive?: boolean,
        @Args('autoAssignTo', { nullable: true }) autoAssignTo?: string,
    ) {
        return mapSchedule(await this.opsService.updateSchedule(id, {
            name, cronExpression, timezone, isActive, autoAssignTo,
        }));
    }

    @Mutation(() => Boolean)
    async deleteOpsSchedule(@Args('id') id: string) {
        return this.opsService.deleteSchedule(id);
    }
}
