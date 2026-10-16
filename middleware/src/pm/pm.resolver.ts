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

    @Field({ nullable: true })
    pmbokEdition?: string;

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

// ─── NEW PMBOK GRAPHQL TYPES ─────────────────────────────

@ObjectType()
export class PmScopeStatement {
    @Field(() => ID) id: string;
    @Field() projectId: string;
    @Field({ nullable: true }) projectObjectives?: string;
    @Field({ nullable: true }) productScopeDescription?: string;
    @Field({ nullable: true }) deliverables?: string;
    @Field({ nullable: true }) acceptanceCriteria?: string;
    @Field({ nullable: true }) exclusions?: string;
    @Field({ nullable: true }) constraints?: string;
    @Field({ nullable: true }) assumptions?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
export class PmWbsItem {
    @Field(() => ID) id: string;
    @Field() projectId: string;
    @Field({ nullable: true }) parentId?: string;
    @Field({ nullable: true }) wbsCode?: string;
    @Field() title: string;
    @Field({ nullable: true }) description?: string;
    @Field(() => Int) level: number;
    @Field(() => Int) sortOrder: number;
    @Field() status: string;
    @Field({ nullable: true }) assignedTo?: string;
    @Field(() => Float, { nullable: true }) estimatedCost?: number;
    @Field(() => Float, { nullable: true }) actualCost?: number;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
export class PmRequirement {
    @Field(() => ID) id: string;
    @Field() projectId: string;
    @Field({ nullable: true }) requirementId?: string;
    @Field() title: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) category?: string;
    @Field() priority: string;
    @Field({ nullable: true }) source?: string;
    @Field({ nullable: true }) wbsItemId?: string;
    @Field({ nullable: true }) testCase?: string;
    @Field({ nullable: true }) verificationMethod?: string;
    @Field() status: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
export class PmMilestone {
    @Field(() => ID) id: string;
    @Field() projectId: string;
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) dueDate?: string;
    @Field({ nullable: true }) completedDate?: string;
    @Field(() => Int) percentComplete: number;
    @Field() isCritical: boolean;
    @Field() status: string;
    @Field(() => Int) sortOrder: number;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
export class PmTaskDependency {
    @Field(() => ID) id: string;
    @Field() projectId: string;
    @Field() predecessorId: string;
    @Field() successorId: string;
    @Field() dependencyType: string;
    @Field(() => Int) lagDays: number;
    @Field() createdAt: string;
}

@ObjectType()
export class PmQualityMetric {
    @Field(() => ID) id: string;
    @Field() projectId: string;
    @Field() metricName: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) unit?: string;
    @Field(() => Float, { nullable: true }) targetValue?: number;
    @Field(() => Float, { nullable: true }) actualValue?: number;
    @Field(() => Float, { nullable: true }) toleranceLower?: number;
    @Field(() => Float, { nullable: true }) toleranceUpper?: number;
    @Field({ nullable: true }) measurementMethod?: string;
    @Field({ nullable: true }) frequency?: string;
    @Field() status: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
export class PmQualityChecklist {
    @Field(() => ID) id: string;
    @Field() projectId: string;
    @Field() checklistName: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) deliverable?: string;
    @Field(() => GraphQLJSON, { nullable: true }) items?: any;
    @Field({ nullable: true }) inspector?: string;
    @Field({ nullable: true }) inspectionDate?: string;
    @Field() status: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
export class PmQualityInspection {
    @Field(() => ID) id: string;
    @Field() projectId: string;
    @Field({ nullable: true }) inspectionType?: string;
    @Field({ nullable: true }) deliverable?: string;
    @Field({ nullable: true }) inspector?: string;
    @Field({ nullable: true }) inspectionDate?: string;
    @Field({ nullable: true }) findings?: string;
    @Field({ nullable: true }) correctiveActions?: string;
    @Field() result: string;
    @Field({ nullable: true }) followUpDate?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
export class PmResourcePlan {
    @Field(() => ID) id: string;
    @Field() projectId: string;
    @Field() resourceName: string;
    @Field({ nullable: true }) role?: string;
    @Field() resourceType: string;
    @Field(() => Int) allocationPercent: number;
    @Field(() => Float, { nullable: true }) hourlyRate?: number;
    @Field({ nullable: true }) startDate?: string;
    @Field({ nullable: true }) endDate?: string;
    @Field(() => Float, { nullable: true }) availabilityHours?: number;
    @Field(() => Float, { nullable: true }) plannedHours?: number;
    @Field(() => Float, { nullable: true }) actualHours?: number;
    @Field({ nullable: true }) skills?: string;
    @Field({ nullable: true }) notes?: string;
    @Field() status: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
export class PmRaciEntry {
    @Field(() => ID) id: string;
    @Field() projectId: string;
    @Field() deliverable: string;
    @Field() personName: string;
    @Field() roleType: string;
    @Field({ nullable: true }) notes?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
export class PmCommPlan {
    @Field(() => ID) id: string;
    @Field() projectId: string;
    @Field() communicationItem: string;
    @Field({ nullable: true }) targetAudience?: string;
    @Field({ nullable: true }) frequency?: string;
    @Field({ nullable: true }) method?: string;
    @Field({ nullable: true }) responsiblePerson?: string;
    @Field({ nullable: true }) keyMessage?: string;
    @Field({ nullable: true }) notes?: string;
    @Field() status: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
export class PmStatusReport {
    @Field(() => ID) id: string;
    @Field() projectId: string;
    @Field({ nullable: true }) reportDate?: string;
    @Field({ nullable: true }) reportPeriod?: string;
    @Field() overallHealth: string;
    @Field() scheduleHealth: string;
    @Field() costHealth: string;
    @Field() scopeHealth: string;
    @Field({ nullable: true }) accomplishments?: string;
    @Field({ nullable: true }) plannedActivities?: string;
    @Field({ nullable: true }) issuesAndRisks?: string;
    @Field({ nullable: true }) decisionsNeeded?: string;
    @Field(() => GraphQLJSON, { nullable: true }) keyMetrics?: any;
    @Field({ nullable: true }) preparedBy?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
export class PmMeetingMinutes {
    @Field(() => ID) id: string;
    @Field() projectId: string;
    @Field({ nullable: true }) meetingType?: string;
    @Field({ nullable: true }) meetingDate?: string;
    @Field() title: string;
    @Field({ nullable: true }) attendees?: string;
    @Field({ nullable: true }) agenda?: string;
    @Field({ nullable: true }) discussion?: string;
    @Field({ nullable: true }) decisions?: string;
    @Field(() => GraphQLJSON, { nullable: true }) actionItems?: any;
    @Field({ nullable: true }) nextMeetingDate?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
export class PmProcurementLink {
    @Field(() => ID) id: string;
    @Field() projectId: string;
    @Field({ nullable: true }) entityType?: string;
    @Field({ nullable: true }) entityId?: string;
    @Field({ nullable: true }) contractType?: string;
    @Field(() => Float, { nullable: true }) budgetAllocated?: number;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) notes?: string;
    @Field() status: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
export class PmStakeholder {
    @Field(() => ID) id: string;
    @Field() projectId: string;
    @Field() name: string;
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) role?: string;
    @Field({ nullable: true }) organization?: string;
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) contactInfo?: string;
    @Field(() => Int, { nullable: true }) interestLevel?: number;
    @Field(() => Int, { nullable: true }) influenceLevel?: number;
    @Field(() => Int, { nullable: true }) powerLevel?: number;
    @Field({ nullable: true }) supportLevel?: string;
    @Field({ nullable: true }) currentEngagement?: string;
    @Field({ nullable: true }) desiredEngagement?: string;
    @Field({ nullable: true }) communicationNeeds?: string;
    @Field({ nullable: true }) influenceStrategy?: string;
    @Field({ nullable: true }) engagementStrategy?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) createdAt?: string;
    @Field({ nullable: true }) updatedAt?: string;
}

@ObjectType()
export class PmChangeRequest {
    @Field(() => ID) id: string;
    @Field() projectId: string;
    @Field({ nullable: true }) changeNumber?: string;
    @Field() title: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) reason?: string;
    @Field({ nullable: true }) impactScope?: string;
    @Field({ nullable: true }) impactSchedule?: string;
    @Field({ nullable: true }) impactCost?: string;
    @Field({ nullable: true }) impactQuality?: string;
    @Field({ nullable: true }) requestedBy?: string;
    @Field({ nullable: true }) requestedDate?: string;
    @Field({ nullable: true }) reviewedBy?: string;
    @Field({ nullable: true }) decision?: string;
    @Field({ nullable: true }) decisionDate?: string;
    @Field({ nullable: true }) decisionNotes?: string;
    @Field({ nullable: true }) implementationNotes?: string;
    @Field() priority: string;
    @Field() status: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
export class PmLessonLearned {
    @Field(() => ID) id: string;
    @Field() projectId: string;
    @Field({ nullable: true }) category?: string;
    @Field() title: string;
    @Field({ nullable: true }) situation?: string;
    @Field({ nullable: true }) impact?: string;
    @Field({ nullable: true }) lesson?: string;
    @Field({ nullable: true }) recommendation?: string;
    @Field({ nullable: true }) submittedBy?: string;
    @Field({ nullable: true }) submittedDate?: string;
    @Field({ nullable: true }) phase?: string;
    @Field(() => [String], { nullable: true }) tags?: string[];
    @Field() createdAt: string;
    @Field() updatedAt: string;
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
    @Field({ nullable: true }) pmbokEdition?: string;
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
    @Field({ nullable: true }) pmbokEdition?: string;
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

// ─── NEW PMBOK INPUT TYPES ───────────────────────────────

@InputType()
export class UpsertPmScopeStatementInput {
    @Field({ nullable: true }) projectObjectives?: string;
    @Field({ nullable: true }) productScopeDescription?: string;
    @Field({ nullable: true }) deliverables?: string;
    @Field({ nullable: true }) acceptanceCriteria?: string;
    @Field({ nullable: true }) exclusions?: string;
    @Field({ nullable: true }) constraints?: string;
    @Field({ nullable: true }) assumptions?: string;
}

@InputType()
export class CreatePmWbsItemInput {
    @Field() projectId: string;
    @Field({ nullable: true }) parentId?: string;
    @Field({ nullable: true }) wbsCode?: string;
    @Field() title: string;
    @Field({ nullable: true }) description?: string;
    @Field(() => Int, { nullable: true }) level?: number;
    @Field(() => Int, { nullable: true }) sortOrder?: number;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) assignedTo?: string;
    @Field(() => Float, { nullable: true }) estimatedCost?: number;
    @Field(() => Float, { nullable: true }) actualCost?: number;
}

@InputType()
export class UpdatePmWbsItemInput {
    @Field({ nullable: true }) parentId?: string;
    @Field({ nullable: true }) wbsCode?: string;
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) description?: string;
    @Field(() => Int, { nullable: true }) level?: number;
    @Field(() => Int, { nullable: true }) sortOrder?: number;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) assignedTo?: string;
    @Field(() => Float, { nullable: true }) estimatedCost?: number;
    @Field(() => Float, { nullable: true }) actualCost?: number;
}

@InputType()
export class CreatePmRequirementInput {
    @Field() projectId: string;
    @Field({ nullable: true }) requirementId?: string;
    @Field() title: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) category?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) source?: string;
    @Field({ nullable: true }) wbsItemId?: string;
    @Field({ nullable: true }) testCase?: string;
    @Field({ nullable: true }) verificationMethod?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
export class UpdatePmRequirementInput {
    @Field({ nullable: true }) requirementId?: string;
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) category?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) source?: string;
    @Field({ nullable: true }) wbsItemId?: string;
    @Field({ nullable: true }) testCase?: string;
    @Field({ nullable: true }) verificationMethod?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
export class CreatePmMilestoneInput {
    @Field() projectId: string;
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) dueDate?: string;
    @Field({ nullable: true }) completedDate?: string;
    @Field(() => Int, { nullable: true }) percentComplete?: number;
    @Field({ nullable: true }) isCritical?: boolean;
    @Field({ nullable: true }) status?: string;
    @Field(() => Int, { nullable: true }) sortOrder?: number;
}

@InputType()
export class UpdatePmMilestoneInput {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) dueDate?: string;
    @Field({ nullable: true }) completedDate?: string;
    @Field(() => Int, { nullable: true }) percentComplete?: number;
    @Field({ nullable: true }) isCritical?: boolean;
    @Field({ nullable: true }) status?: string;
    @Field(() => Int, { nullable: true }) sortOrder?: number;
}

@InputType()
export class CreatePmTaskDependencyInput {
    @Field() projectId: string;
    @Field() predecessorId: string;
    @Field() successorId: string;
    @Field({ nullable: true }) dependencyType?: string;
    @Field(() => Int, { nullable: true }) lagDays?: number;
}

@InputType()
export class CreatePmQualityMetricInput {
    @Field() projectId: string;
    @Field() metricName: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) unit?: string;
    @Field(() => Float, { nullable: true }) targetValue?: number;
    @Field(() => Float, { nullable: true }) actualValue?: number;
    @Field(() => Float, { nullable: true }) toleranceLower?: number;
    @Field(() => Float, { nullable: true }) toleranceUpper?: number;
    @Field({ nullable: true }) measurementMethod?: string;
    @Field({ nullable: true }) frequency?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
export class UpdatePmQualityMetricInput {
    @Field({ nullable: true }) metricName?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) unit?: string;
    @Field(() => Float, { nullable: true }) targetValue?: number;
    @Field(() => Float, { nullable: true }) actualValue?: number;
    @Field(() => Float, { nullable: true }) toleranceLower?: number;
    @Field(() => Float, { nullable: true }) toleranceUpper?: number;
    @Field({ nullable: true }) measurementMethod?: string;
    @Field({ nullable: true }) frequency?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
export class CreatePmQualityChecklistInput {
    @Field() projectId: string;
    @Field() checklistName: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) deliverable?: string;
    @Field(() => GraphQLJSON, { nullable: true }) items?: any;
    @Field({ nullable: true }) inspector?: string;
    @Field({ nullable: true }) inspectionDate?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
export class UpdatePmQualityChecklistInput {
    @Field({ nullable: true }) checklistName?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) deliverable?: string;
    @Field(() => GraphQLJSON, { nullable: true }) items?: any;
    @Field({ nullable: true }) inspector?: string;
    @Field({ nullable: true }) inspectionDate?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
export class CreatePmQualityInspectionInput {
    @Field() projectId: string;
    @Field({ nullable: true }) inspectionType?: string;
    @Field({ nullable: true }) deliverable?: string;
    @Field({ nullable: true }) inspector?: string;
    @Field({ nullable: true }) inspectionDate?: string;
    @Field({ nullable: true }) findings?: string;
    @Field({ nullable: true }) correctiveActions?: string;
    @Field({ nullable: true }) result?: string;
    @Field({ nullable: true }) followUpDate?: string;
}

@InputType()
export class UpdatePmQualityInspectionInput {
    @Field({ nullable: true }) inspectionType?: string;
    @Field({ nullable: true }) deliverable?: string;
    @Field({ nullable: true }) inspector?: string;
    @Field({ nullable: true }) inspectionDate?: string;
    @Field({ nullable: true }) findings?: string;
    @Field({ nullable: true }) correctiveActions?: string;
    @Field({ nullable: true }) result?: string;
    @Field({ nullable: true }) followUpDate?: string;
}

@InputType()
export class CreatePmResourcePlanInput {
    @Field() projectId: string;
    @Field() resourceName: string;
    @Field({ nullable: true }) role?: string;
    @Field({ nullable: true }) resourceType?: string;
    @Field(() => Int, { nullable: true }) allocationPercent?: number;
    @Field(() => Float, { nullable: true }) hourlyRate?: number;
    @Field({ nullable: true }) startDate?: string;
    @Field({ nullable: true }) endDate?: string;
    @Field(() => Float, { nullable: true }) availabilityHours?: number;
    @Field(() => Float, { nullable: true }) plannedHours?: number;
    @Field(() => Float, { nullable: true }) actualHours?: number;
    @Field({ nullable: true }) skills?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
export class UpdatePmResourcePlanInput {
    @Field({ nullable: true }) resourceName?: string;
    @Field({ nullable: true }) role?: string;
    @Field({ nullable: true }) resourceType?: string;
    @Field(() => Int, { nullable: true }) allocationPercent?: number;
    @Field(() => Float, { nullable: true }) hourlyRate?: number;
    @Field({ nullable: true }) startDate?: string;
    @Field({ nullable: true }) endDate?: string;
    @Field(() => Float, { nullable: true }) availabilityHours?: number;
    @Field(() => Float, { nullable: true }) plannedHours?: number;
    @Field(() => Float, { nullable: true }) actualHours?: number;
    @Field({ nullable: true }) skills?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
export class CreatePmRaciEntryInput {
    @Field() projectId: string;
    @Field() deliverable: string;
    @Field() personName: string;
    @Field() roleType: string;
    @Field({ nullable: true }) notes?: string;
}

@InputType()
export class UpdatePmRaciEntryInput {
    @Field({ nullable: true }) deliverable?: string;
    @Field({ nullable: true }) personName?: string;
    @Field({ nullable: true }) roleType?: string;
    @Field({ nullable: true }) notes?: string;
}

@InputType()
export class CreatePmCommPlanInput {
    @Field() projectId: string;
    @Field() communicationItem: string;
    @Field({ nullable: true }) targetAudience?: string;
    @Field({ nullable: true }) frequency?: string;
    @Field({ nullable: true }) method?: string;
    @Field({ nullable: true }) responsiblePerson?: string;
    @Field({ nullable: true }) keyMessage?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
export class UpdatePmCommPlanInput {
    @Field({ nullable: true }) communicationItem?: string;
    @Field({ nullable: true }) targetAudience?: string;
    @Field({ nullable: true }) frequency?: string;
    @Field({ nullable: true }) method?: string;
    @Field({ nullable: true }) responsiblePerson?: string;
    @Field({ nullable: true }) keyMessage?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
export class CreatePmStatusReportInput {
    @Field() projectId: string;
    @Field({ nullable: true }) reportDate?: string;
    @Field({ nullable: true }) reportPeriod?: string;
    @Field({ nullable: true }) overallHealth?: string;
    @Field({ nullable: true }) scheduleHealth?: string;
    @Field({ nullable: true }) costHealth?: string;
    @Field({ nullable: true }) scopeHealth?: string;
    @Field({ nullable: true }) accomplishments?: string;
    @Field({ nullable: true }) plannedActivities?: string;
    @Field({ nullable: true }) issuesAndRisks?: string;
    @Field({ nullable: true }) decisionsNeeded?: string;
    @Field(() => GraphQLJSON, { nullable: true }) keyMetrics?: any;
    @Field({ nullable: true }) preparedBy?: string;
}

@InputType()
export class UpdatePmStatusReportInput {
    @Field({ nullable: true }) reportDate?: string;
    @Field({ nullable: true }) reportPeriod?: string;
    @Field({ nullable: true }) overallHealth?: string;
    @Field({ nullable: true }) scheduleHealth?: string;
    @Field({ nullable: true }) costHealth?: string;
    @Field({ nullable: true }) scopeHealth?: string;
    @Field({ nullable: true }) accomplishments?: string;
    @Field({ nullable: true }) plannedActivities?: string;
    @Field({ nullable: true }) issuesAndRisks?: string;
    @Field({ nullable: true }) decisionsNeeded?: string;
    @Field(() => GraphQLJSON, { nullable: true }) keyMetrics?: any;
    @Field({ nullable: true }) preparedBy?: string;
}

@InputType()
export class CreatePmMeetingMinutesInput {
    @Field() projectId: string;
    @Field({ nullable: true }) meetingType?: string;
    @Field({ nullable: true }) meetingDate?: string;
    @Field() title: string;
    @Field({ nullable: true }) attendees?: string;
    @Field({ nullable: true }) agenda?: string;
    @Field({ nullable: true }) discussion?: string;
    @Field({ nullable: true }) decisions?: string;
    @Field(() => GraphQLJSON, { nullable: true }) actionItems?: any;
    @Field({ nullable: true }) nextMeetingDate?: string;
}

@InputType()
export class UpdatePmMeetingMinutesInput {
    @Field({ nullable: true }) meetingType?: string;
    @Field({ nullable: true }) meetingDate?: string;
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) attendees?: string;
    @Field({ nullable: true }) agenda?: string;
    @Field({ nullable: true }) discussion?: string;
    @Field({ nullable: true }) decisions?: string;
    @Field(() => GraphQLJSON, { nullable: true }) actionItems?: any;
    @Field({ nullable: true }) nextMeetingDate?: string;
}

@InputType()
export class CreatePmProcurementLinkInput {
    @Field() projectId: string;
    @Field({ nullable: true }) entityType?: string;
    @Field({ nullable: true }) entityId?: string;
    @Field({ nullable: true }) contractType?: string;
    @Field(() => Float, { nullable: true }) budgetAllocated?: number;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
export class UpdatePmProcurementLinkInput {
    @Field({ nullable: true }) entityType?: string;
    @Field({ nullable: true }) entityId?: string;
    @Field({ nullable: true }) contractType?: string;
    @Field(() => Float, { nullable: true }) budgetAllocated?: number;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
export class CreatePmStakeholderInput {
    @Field() projectId: string;
    @Field() name: string;
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) role?: string;
    @Field({ nullable: true }) organization?: string;
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) contactInfo?: string;
    @Field(() => Int, { nullable: true }) interestLevel?: number;
    @Field(() => Int, { nullable: true }) influenceLevel?: number;
    @Field(() => Int, { nullable: true }) powerLevel?: number;
    @Field({ nullable: true }) supportLevel?: string;
    @Field({ nullable: true }) currentEngagement?: string;
    @Field({ nullable: true }) desiredEngagement?: string;
    @Field({ nullable: true }) communicationNeeds?: string;
    @Field({ nullable: true }) influenceStrategy?: string;
    @Field({ nullable: true }) engagementStrategy?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
export class UpdatePmStakeholderInput {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) role?: string;
    @Field({ nullable: true }) organization?: string;
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) contactInfo?: string;
    @Field(() => Int, { nullable: true }) interestLevel?: number;
    @Field(() => Int, { nullable: true }) influenceLevel?: number;
    @Field(() => Int, { nullable: true }) powerLevel?: number;
    @Field({ nullable: true }) supportLevel?: string;
    @Field({ nullable: true }) currentEngagement?: string;
    @Field({ nullable: true }) desiredEngagement?: string;
    @Field({ nullable: true }) communicationNeeds?: string;
    @Field({ nullable: true }) influenceStrategy?: string;
    @Field({ nullable: true }) engagementStrategy?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
export class CreatePmChangeRequestInput {
    @Field() projectId: string;
    @Field({ nullable: true }) changeNumber?: string;
    @Field() title: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) reason?: string;
    @Field({ nullable: true }) impactScope?: string;
    @Field({ nullable: true }) impactSchedule?: string;
    @Field({ nullable: true }) impactCost?: string;
    @Field({ nullable: true }) impactQuality?: string;
    @Field({ nullable: true }) requestedBy?: string;
    @Field({ nullable: true }) requestedDate?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
export class UpdatePmChangeRequestInput {
    @Field({ nullable: true }) changeNumber?: string;
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) reason?: string;
    @Field({ nullable: true }) impactScope?: string;
    @Field({ nullable: true }) impactSchedule?: string;
    @Field({ nullable: true }) impactCost?: string;
    @Field({ nullable: true }) impactQuality?: string;
    @Field({ nullable: true }) requestedBy?: string;
    @Field({ nullable: true }) requestedDate?: string;
    @Field({ nullable: true }) reviewedBy?: string;
    @Field({ nullable: true }) decision?: string;
    @Field({ nullable: true }) decisionDate?: string;
    @Field({ nullable: true }) decisionNotes?: string;
    @Field({ nullable: true }) implementationNotes?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
export class CreatePmLessonLearnedInput {
    @Field() projectId: string;
    @Field({ nullable: true }) category?: string;
    @Field() title: string;
    @Field({ nullable: true }) situation?: string;
    @Field({ nullable: true }) impact?: string;
    @Field({ nullable: true }) lesson?: string;
    @Field({ nullable: true }) recommendation?: string;
    @Field({ nullable: true }) submittedBy?: string;
    @Field({ nullable: true }) submittedDate?: string;
    @Field({ nullable: true }) phase?: string;
    @Field(() => [String], { nullable: true }) tags?: string[];
}

@InputType()
export class UpdatePmLessonLearnedInput {
    @Field({ nullable: true }) category?: string;
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) situation?: string;
    @Field({ nullable: true }) impact?: string;
    @Field({ nullable: true }) lesson?: string;
    @Field({ nullable: true }) recommendation?: string;
    @Field({ nullable: true }) submittedBy?: string;
    @Field({ nullable: true }) submittedDate?: string;
    @Field({ nullable: true }) phase?: string;
    @Field(() => [String], { nullable: true }) tags?: string[];
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
        pmbokEdition: row.pmbok_edition,
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

function mapScopeStatement(row: any): PmScopeStatement {
    return {
        id: row.id, projectId: row.project_id,
        projectObjectives: row.project_objectives, productScopeDescription: row.product_scope_description,
        deliverables: row.deliverables, acceptanceCriteria: row.acceptance_criteria,
        exclusions: row.exclusions, constraints: row.constraints, assumptions: row.assumptions,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapWbsItem(row: any): PmWbsItem {
    return {
        id: row.id, projectId: row.project_id, parentId: row.parent_id,
        wbsCode: row.wbs_code, title: row.title, description: row.description,
        level: row.level || 0, sortOrder: row.sort_order || 0, status: row.status,
        assignedTo: row.assigned_to, estimatedCost: row.estimated_cost, actualCost: row.actual_cost,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapRequirement(row: any): PmRequirement {
    return {
        id: row.id, projectId: row.project_id, requirementId: row.requirement_id,
        title: row.title, description: row.description, category: row.category,
        priority: row.priority, source: row.source, wbsItemId: row.wbs_item_id,
        testCase: row.test_case, verificationMethod: row.verification_method, status: row.status,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapMilestone(row: any): PmMilestone {
    return {
        id: row.id, projectId: row.project_id, name: row.name, description: row.description,
        dueDate: row.due_date, completedDate: row.completed_date,
        percentComplete: row.percent_complete || 0, isCritical: row.is_critical || false,
        status: row.status, sortOrder: row.sort_order || 0,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapTaskDependency(row: any): PmTaskDependency {
    return {
        id: row.id, projectId: row.project_id,
        predecessorId: row.predecessor_id, successorId: row.successor_id,
        dependencyType: row.dependency_type, lagDays: row.lag_days || 0,
        createdAt: row.created_at,
    };
}

function mapQualityMetric(row: any): PmQualityMetric {
    return {
        id: row.id, projectId: row.project_id, metricName: row.metric_name,
        description: row.description, unit: row.unit, targetValue: row.target_value,
        actualValue: row.actual_value, toleranceLower: row.tolerance_lower,
        toleranceUpper: row.tolerance_upper, measurementMethod: row.measurement_method,
        frequency: row.frequency, status: row.status,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapQualityChecklist(row: any): PmQualityChecklist {
    return {
        id: row.id, projectId: row.project_id, checklistName: row.checklist_name,
        description: row.description, deliverable: row.deliverable, items: row.items,
        inspector: row.inspector, inspectionDate: row.inspection_date, status: row.status,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapQualityInspection(row: any): PmQualityInspection {
    return {
        id: row.id, projectId: row.project_id, inspectionType: row.inspection_type,
        deliverable: row.deliverable, inspector: row.inspector, inspectionDate: row.inspection_date,
        findings: row.findings, correctiveActions: row.corrective_actions, result: row.result,
        followUpDate: row.follow_up_date, createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapResourcePlan(row: any): PmResourcePlan {
    return {
        id: row.id, projectId: row.project_id, resourceName: row.resource_name,
        role: row.role, resourceType: row.resource_type,
        allocationPercent: row.allocation_percent || 100, hourlyRate: row.hourly_rate,
        startDate: row.start_date, endDate: row.end_date,
        availabilityHours: row.availability_hours, plannedHours: row.planned_hours,
        actualHours: row.actual_hours, skills: row.skills, notes: row.notes, status: row.status,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapRaciEntry(row: any): PmRaciEntry {
    return {
        id: row.id, projectId: row.project_id, deliverable: row.deliverable,
        personName: row.person_name, roleType: row.role_type, notes: row.notes,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapCommPlan(row: any): PmCommPlan {
    return {
        id: row.id, projectId: row.project_id, communicationItem: row.communication_item,
        targetAudience: row.target_audience, frequency: row.frequency, method: row.method,
        responsiblePerson: row.responsible_person, keyMessage: row.key_message,
        notes: row.notes, status: row.status,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapStatusReport(row: any): PmStatusReport {
    return {
        id: row.id, projectId: row.project_id, reportDate: row.report_date,
        reportPeriod: row.report_period, overallHealth: row.overall_health,
        scheduleHealth: row.schedule_health, costHealth: row.cost_health,
        scopeHealth: row.scope_health, accomplishments: row.accomplishments,
        plannedActivities: row.planned_activities, issuesAndRisks: row.issues_and_risks,
        decisionsNeeded: row.decisions_needed, keyMetrics: row.key_metrics,
        preparedBy: row.prepared_by, createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapMeetingMinutes(row: any): PmMeetingMinutes {
    return {
        id: row.id, projectId: row.project_id, meetingType: row.meeting_type,
        meetingDate: row.meeting_date, title: row.title, attendees: row.attendees,
        agenda: row.agenda, discussion: row.discussion, decisions: row.decisions,
        actionItems: row.action_items, nextMeetingDate: row.next_meeting_date,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapProcurementLink(row: any): PmProcurementLink {
    return {
        id: row.id, projectId: row.project_id, entityType: row.entity_type,
        entityId: row.entity_id, contractType: row.contract_type,
        budgetAllocated: row.budget_allocated, description: row.description,
        notes: row.notes, status: row.status,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapStakeholder(row: any): PmStakeholder {
    return {
        id: row.id, projectId: row.project_id, name: row.name, title: row.title,
        role: row.role, organization: row.organization, email: row.email, phone: row.phone,
        contactInfo: row.contact_info,
        interestLevel: row.interest_level || 3, influenceLevel: row.influence_level || 3,
        powerLevel: row.power_level || 3, supportLevel: row.support_level || 'neutral',
        currentEngagement: row.current_engagement, desiredEngagement: row.desired_engagement,
        communicationNeeds: row.communication_needs, influenceStrategy: row.influence_strategy,
        engagementStrategy: row.influence_strategy,
        notes: row.notes, status: row.status,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapChangeRequest(row: any): PmChangeRequest {
    return {
        id: row.id, projectId: row.project_id, changeNumber: row.change_number,
        title: row.title, description: row.description, reason: row.reason,
        impactScope: row.impact_scope, impactSchedule: row.impact_schedule,
        impactCost: row.impact_cost, impactQuality: row.impact_quality,
        requestedBy: row.requested_by, requestedDate: row.requested_date,
        reviewedBy: row.reviewed_by, decision: row.decision, decisionDate: row.decision_date,
        decisionNotes: row.decision_notes, implementationNotes: row.implementation_notes,
        priority: row.priority, status: row.status,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapLessonLearned(row: any): PmLessonLearned {
    return {
        id: row.id, projectId: row.project_id, category: row.category,
        title: row.title, situation: row.situation, impact: row.impact,
        lesson: row.lesson, recommendation: row.recommendation,
        submittedBy: row.submitted_by, submittedDate: row.submitted_date,
        phase: row.phase, tags: row.tags,
        createdAt: row.created_at, updatedAt: row.updated_at,
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
        return mapEarnedValue(row);
    }

    // ── SCOPE MANAGEMENT ────────────────────────────────────

    @Query(() => PmScopeStatement, { nullable: true })
    async pmScopeStatement(@Args('projectId') projectId: string) {
        const row = await this.pmService.getScopeStatement(projectId);
        if (!row) return null;
        return mapScopeStatement(row);
    }

    @Mutation(() => PmScopeStatement)
    async upsertPmScopeStatement(
        @Args('projectId') projectId: string,
        @Args('tenantId') tenantId: string,
        @Args('input') input: UpsertPmScopeStatementInput,
    ) {
        const row = await this.pmService.upsertScopeStatement(projectId, tenantId, input);
        return mapScopeStatement(row);
    }

    @Query(() => [PmWbsItem])
    async pmWbsItems(@Args('projectId') projectId: string) {
        const rows = await this.pmService.getWbsItems(projectId);
        return (rows || []).map(mapWbsItem);
    }

    @Mutation(() => PmWbsItem)
    async createPmWbsItem(@Args('tenantId') tenantId: string, @Args('input') input: CreatePmWbsItemInput) {
        const row = await this.pmService.createWbsItem(tenantId, input);
        return mapWbsItem(row);
    }

    @Mutation(() => PmWbsItem)
    async updatePmWbsItem(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdatePmWbsItemInput) {
        const row = await this.pmService.updateWbsItem(id, input);
        return mapWbsItem(row);
    }

    @Mutation(() => Boolean)
    async deletePmWbsItem(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteWbsItem(id);
    }

    @Query(() => [PmRequirement])
    async pmRequirements(@Args('projectId') projectId: string) {
        const rows = await this.pmService.getRequirements(projectId);
        return (rows || []).map(mapRequirement);
    }

    @Mutation(() => PmRequirement)
    async createPmRequirement(@Args('tenantId') tenantId: string, @Args('input') input: CreatePmRequirementInput) {
        const row = await this.pmService.createRequirement(tenantId, input);
        return mapRequirement(row);
    }

    @Mutation(() => PmRequirement)
    async updatePmRequirement(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdatePmRequirementInput) {
        const row = await this.pmService.updateRequirement(id, input);
        return mapRequirement(row);
    }

    @Mutation(() => Boolean)
    async deletePmRequirement(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteRequirement(id);
    }

    // ── SCHEDULE MANAGEMENT ─────────────────────────────────

    @Query(() => [PmMilestone])
    async pmMilestones(@Args('projectId') projectId: string) {
        const rows = await this.pmService.getMilestones(projectId);
        return (rows || []).map(mapMilestone);
    }

    @Mutation(() => PmMilestone)
    async createPmMilestone(@Args('tenantId') tenantId: string, @Args('input') input: CreatePmMilestoneInput) {
        const row = await this.pmService.createMilestone(tenantId, input);
        return mapMilestone(row);
    }

    @Mutation(() => PmMilestone)
    async updatePmMilestone(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdatePmMilestoneInput) {
        const row = await this.pmService.updateMilestone(id, input);
        return mapMilestone(row);
    }

    @Mutation(() => Boolean)
    async deletePmMilestone(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteMilestone(id);
    }

    @Query(() => [PmTaskDependency])
    async pmTaskDependencies(@Args('projectId') projectId: string) {
        const rows = await this.pmService.getTaskDependencies(projectId);
        return (rows || []).map(mapTaskDependency);
    }

    @Mutation(() => PmTaskDependency)
    async createPmTaskDependency(@Args('input') input: CreatePmTaskDependencyInput) {
        const row = await this.pmService.createTaskDependency(input);
        return mapTaskDependency(row);
    }

    @Mutation(() => Boolean)
    async deletePmTaskDependency(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteTaskDependency(id);
    }

    // ── QUALITY MANAGEMENT ──────────────────────────────────

    @Query(() => [PmQualityMetric])
    async pmQualityMetrics(@Args('projectId') projectId: string) {
        const rows = await this.pmService.getQualityMetrics(projectId);
        return (rows || []).map(mapQualityMetric);
    }

    @Mutation(() => PmQualityMetric)
    async createPmQualityMetric(@Args('tenantId') tenantId: string, @Args('input') input: CreatePmQualityMetricInput) {
        const row = await this.pmService.createQualityMetric(tenantId, input);
        return mapQualityMetric(row);
    }

    @Mutation(() => PmQualityMetric)
    async updatePmQualityMetric(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdatePmQualityMetricInput) {
        const row = await this.pmService.updateQualityMetric(id, input);
        return mapQualityMetric(row);
    }

    @Mutation(() => Boolean)
    async deletePmQualityMetric(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteQualityMetric(id);
    }

    @Query(() => [PmQualityChecklist])
    async pmQualityChecklists(@Args('projectId') projectId: string) {
        const rows = await this.pmService.getQualityChecklists(projectId);
        return (rows || []).map(mapQualityChecklist);
    }

    @Mutation(() => PmQualityChecklist)
    async createPmQualityChecklist(@Args('tenantId') tenantId: string, @Args('input') input: CreatePmQualityChecklistInput) {
        const row = await this.pmService.createQualityChecklist(tenantId, input);
        return mapQualityChecklist(row);
    }

    @Mutation(() => PmQualityChecklist)
    async updatePmQualityChecklist(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdatePmQualityChecklistInput) {
        const row = await this.pmService.updateQualityChecklist(id, input);
        return mapQualityChecklist(row);
    }

    @Mutation(() => Boolean)
    async deletePmQualityChecklist(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteQualityChecklist(id);
    }

    @Query(() => [PmQualityInspection])
    async pmQualityInspections(@Args('projectId') projectId: string) {
        const rows = await this.pmService.getQualityInspections(projectId);
        return (rows || []).map(mapQualityInspection);
    }

    @Mutation(() => PmQualityInspection)
    async createPmQualityInspection(@Args('tenantId') tenantId: string, @Args('input') input: CreatePmQualityInspectionInput) {
        const row = await this.pmService.createQualityInspection(tenantId, input);
        return mapQualityInspection(row);
    }

    @Mutation(() => PmQualityInspection)
    async updatePmQualityInspection(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdatePmQualityInspectionInput) {
        const row = await this.pmService.updateQualityInspection(id, input);
        return mapQualityInspection(row);
    }

    @Mutation(() => Boolean)
    async deletePmQualityInspection(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteQualityInspection(id);
    }

    // ── RESOURCE MANAGEMENT ─────────────────────────────────

    @Query(() => [PmResourcePlan])
    async pmResourcePlans(@Args('projectId') projectId: string) {
        const rows = await this.pmService.getResourcePlans(projectId);
        return (rows || []).map(mapResourcePlan);
    }

    @Mutation(() => PmResourcePlan)
    async createPmResourcePlan(@Args('tenantId') tenantId: string, @Args('input') input: CreatePmResourcePlanInput) {
        const row = await this.pmService.createResourcePlan(tenantId, input);
        return mapResourcePlan(row);
    }

    @Mutation(() => PmResourcePlan)
    async updatePmResourcePlan(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdatePmResourcePlanInput) {
        const row = await this.pmService.updateResourcePlan(id, input);
        return mapResourcePlan(row);
    }

    @Mutation(() => Boolean)
    async deletePmResourcePlan(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteResourcePlan(id);
    }

    @Query(() => [PmRaciEntry])
    async pmRaciMatrix(@Args('projectId') projectId: string) {
        const rows = await this.pmService.getRaciMatrix(projectId);
        return (rows || []).map(mapRaciEntry);
    }

    @Mutation(() => PmRaciEntry)
    async createPmRaciEntry(@Args('tenantId') tenantId: string, @Args('input') input: CreatePmRaciEntryInput) {
        const row = await this.pmService.createRaciEntry(tenantId, input);
        return mapRaciEntry(row);
    }

    @Mutation(() => PmRaciEntry)
    async updatePmRaciEntry(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdatePmRaciEntryInput) {
        const row = await this.pmService.updateRaciEntry(id, input);
        return mapRaciEntry(row);
    }

    @Mutation(() => Boolean)
    async deletePmRaciEntry(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteRaciEntry(id);
    }

    // ── COMMUNICATIONS MANAGEMENT ───────────────────────────

    @Query(() => [PmCommPlan])
    async pmCommPlans(@Args('projectId') projectId: string) {
        const rows = await this.pmService.getCommPlans(projectId);
        return (rows || []).map(mapCommPlan);
    }

    @Mutation(() => PmCommPlan)
    async createPmCommPlan(@Args('tenantId') tenantId: string, @Args('input') input: CreatePmCommPlanInput) {
        const row = await this.pmService.createCommPlan(tenantId, input);
        return mapCommPlan(row);
    }

    @Mutation(() => PmCommPlan)
    async updatePmCommPlan(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdatePmCommPlanInput) {
        const row = await this.pmService.updateCommPlan(id, input);
        return mapCommPlan(row);
    }

    @Mutation(() => Boolean)
    async deletePmCommPlan(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteCommPlan(id);
    }

    @Query(() => [PmStatusReport])
    async pmStatusReports(@Args('projectId') projectId: string) {
        const rows = await this.pmService.getStatusReports(projectId);
        return (rows || []).map(mapStatusReport);
    }

    @Mutation(() => PmStatusReport)
    async createPmStatusReport(@Args('tenantId') tenantId: string, @Args('input') input: CreatePmStatusReportInput) {
        const row = await this.pmService.createStatusReport(tenantId, input);
        return mapStatusReport(row);
    }

    @Mutation(() => PmStatusReport)
    async updatePmStatusReport(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdatePmStatusReportInput) {
        const row = await this.pmService.updateStatusReport(id, input);
        return mapStatusReport(row);
    }

    @Mutation(() => Boolean)
    async deletePmStatusReport(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteStatusReport(id);
    }

    @Query(() => [PmMeetingMinutes])
    async pmMeetingMinutes(@Args('projectId') projectId: string) {
        const rows = await this.pmService.getMeetingMinutes(projectId);
        return (rows || []).map(mapMeetingMinutes);
    }

    @Mutation(() => PmMeetingMinutes)
    async createPmMeetingMinutes(@Args('tenantId') tenantId: string, @Args('input') input: CreatePmMeetingMinutesInput) {
        const row = await this.pmService.createMeetingMinutes(tenantId, input);
        return mapMeetingMinutes(row);
    }

    @Mutation(() => PmMeetingMinutes)
    async updatePmMeetingMinutes(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdatePmMeetingMinutesInput) {
        const row = await this.pmService.updateMeetingMinutes(id, input);
        return mapMeetingMinutes(row);
    }

    @Mutation(() => Boolean)
    async deletePmMeetingMinutes(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteMeetingMinutes(id);
    }

    // ── PROCUREMENT MANAGEMENT ──────────────────────────────

    @Query(() => [PmProcurementLink])
    async pmProcurementLinks(@Args('projectId') projectId: string) {
        const rows = await this.pmService.getProcurementLinks(projectId);
        return (rows || []).map(mapProcurementLink);
    }

    @Mutation(() => PmProcurementLink)
    async createPmProcurementLink(@Args('tenantId') tenantId: string, @Args('input') input: CreatePmProcurementLinkInput) {
        const row = await this.pmService.createProcurementLink(tenantId, input);
        return mapProcurementLink(row);
    }

    @Mutation(() => PmProcurementLink)
    async updatePmProcurementLink(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdatePmProcurementLinkInput) {
        const row = await this.pmService.updateProcurementLink(id, input);
        return mapProcurementLink(row);
    }

    @Mutation(() => Boolean)
    async deletePmProcurementLink(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteProcurementLink(id);
    }

    // ── STAKEHOLDER MANAGEMENT ──────────────────────────────

    @Query(() => [PmStakeholder])
    async pmStakeholders(@Args('projectId') projectId: string) {
        const rows = await this.pmService.getStakeholders(projectId);
        return (rows || []).map(mapStakeholder);
    }

    @Mutation(() => PmStakeholder)
    async createPmStakeholder(@Args('tenantId') tenantId: string, @Args('input') input: CreatePmStakeholderInput) {
        const row = await this.pmService.createStakeholder(tenantId, input);
        return mapStakeholder(row);
    }

    @Mutation(() => PmStakeholder)
    async updatePmStakeholder(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdatePmStakeholderInput) {
        const row = await this.pmService.updateStakeholder(id, input);
        return mapStakeholder(row);
    }

    @Mutation(() => Boolean)
    async deletePmStakeholder(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteStakeholder(id);
    }

    // ── INTEGRATION (Change Requests & Lessons Learned) ─────

    @Query(() => [PmChangeRequest])
    async pmChangeRequests(@Args('projectId') projectId: string) {
        const rows = await this.pmService.getChangeRequests(projectId);
        return (rows || []).map(mapChangeRequest);
    }

    @Mutation(() => PmChangeRequest)
    async createPmChangeRequest(@Args('tenantId') tenantId: string, @Args('input') input: CreatePmChangeRequestInput) {
        const row = await this.pmService.createChangeRequest(tenantId, input);
        return mapChangeRequest(row);
    }

    @Mutation(() => PmChangeRequest)
    async updatePmChangeRequest(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdatePmChangeRequestInput) {
        const row = await this.pmService.updateChangeRequest(id, input);
        return mapChangeRequest(row);
    }

    @Mutation(() => Boolean)
    async deletePmChangeRequest(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteChangeRequest(id);
    }

    @Query(() => [PmLessonLearned])
    async pmLessonsLearned(@Args('projectId') projectId: string) {
        const rows = await this.pmService.getLessonsLearned(projectId);
        return (rows || []).map(mapLessonLearned);
    }

    @Mutation(() => PmLessonLearned)
    async createPmLessonLearned(@Args('tenantId') tenantId: string, @Args('input') input: CreatePmLessonLearnedInput) {
        const row = await this.pmService.createLessonLearned(tenantId, input);
        return mapLessonLearned(row);
    }

    @Mutation(() => PmLessonLearned)
    async updatePmLessonLearned(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdatePmLessonLearnedInput) {
        const row = await this.pmService.updateLessonLearned(id, input);
        return mapLessonLearned(row);
    }

    @Mutation(() => Boolean)
    async deletePmLessonLearned(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteLessonLearned(id);
    }

    // ── AI GENERATORS (New) ─────────────────────────────────

    @Query(() => GraphQLJSON)
    async generateWbs(@Args('projectId') projectId: string) {
        return this.pmService.generateWbs(projectId);
    }

    @Query(() => GraphQLJSON)
    async generateStakeholderAnalysis(@Args('projectId') projectId: string) {
        return this.pmService.generateStakeholderAnalysis(projectId);
    }

    @Query(() => GraphQLJSON)
    async generateQualityChecklist(
        @Args('projectId') projectId: string,
        @Args('deliverable') deliverable: string,
    ) {
        return this.pmService.generateQualityChecklist(projectId, deliverable);
    }

    @Query(() => GraphQLJSON)
    async generateCommPlan(@Args('projectId') projectId: string) {
        return this.pmService.generateCommPlan(projectId);
    }

    // ── ACTIVITIES CRUD ─────────────────────────────────────

    @Query(() => GraphQLJSON)
    async pmActivities(@Args('projectId') projectId: string) {
        return this.pmService.getActivities(projectId);
    }

    @Mutation(() => GraphQLJSON)
    async createPmActivity(
        @Args('tenantId') tenantId: string,
        @Args('input', { type: () => GraphQLJSON }) input: any,
    ) {
        return this.pmService.createActivity(tenantId, input);
    }

    @Mutation(() => GraphQLJSON)
    async updatePmActivity(
        @Args('id', { type: () => ID }) id: string,
        @Args('input', { type: () => GraphQLJSON }) input: any,
    ) {
        return this.pmService.updateActivity(id, input);
    }

    @Mutation(() => Boolean)
    async deletePmActivity(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteActivity(id);
    }

    // ── AI: Schedule from WBS ──────────────────────────────

    @Query(() => GraphQLJSON)
    async generateScheduleFromWbs(@Args('projectId') projectId: string) {
        return this.pmService.generateScheduleFromWbs(projectId);
    }

    // ── AI: Tasks from WBS ─────────────────────────────────

    @Query(() => GraphQLJSON)
    async generateTasksFromWbs(@Args('projectId') projectId: string) {
        return this.pmService.generateTasksFromWbs(projectId);
    }

    // ══════════════════════════════════════════════════════════
    // ─── PMBOK 7: PRINCIPLES ────────────────────────────────
    // ══════════════════════════════════════════════════════════

    @Query(() => GraphQLJSON)
    async pmPrincipleAssessments(@Args('projectId') projectId: string) {
        return this.pmService.getPrincipleAssessments(projectId);
    }

    @Mutation(() => GraphQLJSON)
    async upsertPmPrincipleAssessment(
        @Args('tenantId') tenantId: string,
        @Args('projectId') projectId: string,
        @Args('principleKey') principleKey: string,
        @Args('principleName') principleName: string,
        @Args('score', { type: () => Int, nullable: true }) score?: number,
        @Args('notes', { nullable: true }) notes?: string,
        @Args('evidence', { nullable: true }) evidence?: string,
    ) {
        return this.pmService.upsertPrincipleAssessment(tenantId, {
            projectId, principleKey, principleName, score, notes, evidence,
        });
    }

    @Mutation(() => Boolean)
    async deletePmPrincipleAssessment(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deletePrincipleAssessment(id);
    }

    // ══════════════════════════════════════════════════════════
    // ─── PMBOK 7: PERFORMANCE DOMAINS ───────────────────────
    // ══════════════════════════════════════════════════════════

    @Query(() => GraphQLJSON)
    async pmDomainHealth(@Args('projectId') projectId: string) {
        return this.pmService.getDomainHealth(projectId);
    }

    @Mutation(() => GraphQLJSON)
    async upsertPmDomainHealth(
        @Args('tenantId') tenantId: string,
        @Args('projectId') projectId: string,
        @Args('domainKey') domainKey: string,
        @Args('domainName') domainName: string,
        @Args('healthStatus', { nullable: true }) healthStatus?: string,
        @Args('score', { type: () => Int, nullable: true }) score?: number,
        @Args('description', { nullable: true }) description?: string,
        @Args('outcomesAchieved', { nullable: true }) outcomesAchieved?: string,
        @Args('challenges', { nullable: true }) challenges?: string,
        @Args('improvementActions', { nullable: true }) improvementActions?: string,
    ) {
        return this.pmService.upsertDomainHealth(tenantId, {
            projectId, domainKey, domainName, healthStatus, score,
            description, outcomesAchieved, challenges, improvementActions,
        });
    }

    @Mutation(() => Boolean)
    async deletePmDomainHealth(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteDomainHealth(id);
    }

    // ══════════════════════════════════════════════════════════
    // ─── PMBOK 7: BENEFITS ──────────────────────────────────
    // ══════════════════════════════════════════════════════════

    @Query(() => GraphQLJSON)
    async pmBenefits(@Args('projectId') projectId: string) {
        return this.pmService.getBenefits(projectId);
    }

    @Mutation(() => GraphQLJSON)
    async createPmBenefit(
        @Args('tenantId') tenantId: string,
        @Args('projectId') projectId: string,
        @Args('benefitName') benefitName: string,
        @Args('description', { nullable: true }) description?: string,
        @Args('category', { nullable: true }) category?: string,
        @Args('targetValue', { nullable: true }) targetValue?: string,
        @Args('actualValue', { nullable: true }) actualValue?: string,
        @Args('measurementMethod', { nullable: true }) measurementMethod?: string,
        @Args('baseline', { nullable: true }) baseline?: string,
        @Args('targetDate', { nullable: true }) targetDate?: string,
        @Args('owner', { nullable: true }) owner?: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('notes', { nullable: true }) notes?: string,
    ) {
        return this.pmService.createBenefit(tenantId, {
            projectId, benefitName, description, category, targetValue, actualValue,
            measurementMethod, baseline, targetDate, owner, status, notes,
        });
    }

    @Mutation(() => GraphQLJSON)
    async updatePmBenefit(
        @Args('id', { type: () => ID }) id: string,
        @Args('benefitName', { nullable: true }) benefitName?: string,
        @Args('description', { nullable: true }) description?: string,
        @Args('category', { nullable: true }) category?: string,
        @Args('targetValue', { nullable: true }) targetValue?: string,
        @Args('actualValue', { nullable: true }) actualValue?: string,
        @Args('measurementMethod', { nullable: true }) measurementMethod?: string,
        @Args('baseline', { nullable: true }) baseline?: string,
        @Args('targetDate', { nullable: true }) targetDate?: string,
        @Args('owner', { nullable: true }) owner?: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('notes', { nullable: true }) notes?: string,
    ) {
        return this.pmService.updateBenefit(id, {
            benefitName, description, category, targetValue, actualValue,
            measurementMethod, baseline, targetDate, owner, status, notes,
        });
    }

    @Mutation(() => Boolean)
    async deletePmBenefit(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteBenefit(id);
    }

    // ══════════════════════════════════════════════════════════
    // ─── PMBOK 7: TAILORING ─────────────────────────────────
    // ══════════════════════════════════════════════════════════

    @Query(() => GraphQLJSON)
    async pmTailoringLog(@Args('projectId') projectId: string) {
        return this.pmService.getTailoringLog(projectId);
    }

    @Mutation(() => GraphQLJSON)
    async createPmTailoringEntry(
        @Args('tenantId') tenantId: string,
        @Args('projectId') projectId: string,
        @Args('area') area: string,
        @Args('tailoredApproach') tailoredApproach: string,
        @Args('rationale') rationale: string,
        @Args('originalApproach', { nullable: true }) originalApproach?: string,
        @Args('impact', { nullable: true }) impact?: string,
        @Args('decidedBy', { nullable: true }) decidedBy?: string,
        @Args('status', { nullable: true }) status?: string,
    ) {
        return this.pmService.createTailoringEntry(tenantId, {
            projectId, area, tailoredApproach, rationale, originalApproach, impact, decidedBy, status,
        });
    }

    @Mutation(() => GraphQLJSON)
    async updatePmTailoringEntry(
        @Args('id', { type: () => ID }) id: string,
        @Args('area', { nullable: true }) area?: string,
        @Args('tailoredApproach', { nullable: true }) tailoredApproach?: string,
        @Args('rationale', { nullable: true }) rationale?: string,
        @Args('originalApproach', { nullable: true }) originalApproach?: string,
        @Args('impact', { nullable: true }) impact?: string,
        @Args('decidedBy', { nullable: true }) decidedBy?: string,
        @Args('status', { nullable: true }) status?: string,
    ) {
        return this.pmService.updateTailoringEntry(id, {
            area, tailoredApproach, rationale, originalApproach, impact, decidedBy, status,
        });
    }

    @Mutation(() => Boolean)
    async deletePmTailoringEntry(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteTailoringEntry(id);
    }

    @Query(() => GraphQLJSON)
    async generateTailoringRecommendations(@Args('projectId') projectId: string) {
        return this.pmService.generateTailoringRecommendations(projectId);
    }

    // ══════════════════════════════════════════════════════════
    // ─── PMBOK 8: FOCUS AREAS ───────────────────────────────
    // ══════════════════════════════════════════════════════════

    @Query(() => GraphQLJSON)
    async pmFocusAreas(@Args('projectId') projectId: string) {
        return this.pmService.getFocusAreas(projectId);
    }

    @Mutation(() => GraphQLJSON)
    async upsertPmFocusArea(
        @Args('tenantId') tenantId: string,
        @Args('projectId') projectId: string,
        @Args('focusAreaKey') focusAreaKey: string,
        @Args('focusAreaName') focusAreaName: string,
        @Args('progressPercent', { type: () => Int, nullable: true }) progressPercent?: number,
        @Args('status', { nullable: true }) status?: string,
        @Args('notes', { nullable: true }) notes?: string,
        @Args('keyDeliverables', { nullable: true }) keyDeliverables?: string,
        @Args('totalItems', { type: () => Int, nullable: true }) totalItems?: number,
    ) {
        return this.pmService.upsertFocusArea(tenantId, {
            projectId, focusAreaKey, focusAreaName, progressPercent, status, notes, keyDeliverables, totalItems,
        });
    }

    @Mutation(() => Boolean)
    async deletePmFocusArea(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteFocusArea(id);
    }

    // ══════════════════════════════════════════════════════════
    // ─── PMBOK 8: GOVERNANCE ────────────────────────────────
    // ══════════════════════════════════════════════════════════

    @Query(() => GraphQLJSON)
    async pmGovernanceDecisions(@Args('projectId') projectId: string) {
        return this.pmService.getGovernanceDecisions(projectId);
    }

    @Mutation(() => GraphQLJSON)
    async createPmGovernanceDecision(
        @Args('tenantId') tenantId: string,
        @Args('projectId') projectId: string,
        @Args('title') title: string,
        @Args('decisionNumber', { nullable: true }) decisionNumber?: string,
        @Args('description', { nullable: true }) description?: string,
        @Args('category', { nullable: true }) category?: string,
        @Args('decision', { nullable: true }) decision?: string,
        @Args('decidedBy', { nullable: true }) decidedBy?: string,
        @Args('decisionDate', { nullable: true }) decisionDate?: string,
        @Args('escalationLevel', { nullable: true }) escalationLevel?: string,
        @Args('impact', { nullable: true }) impact?: string,
        @Args('followUpActions', { nullable: true }) followUpActions?: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('dueDate', { nullable: true }) dueDate?: string,
    ) {
        return this.pmService.createGovernanceDecision(tenantId, {
            projectId, title, decisionNumber, description, category, decision,
            decidedBy, decisionDate, escalationLevel, impact, followUpActions, status, dueDate,
        });
    }

    @Mutation(() => GraphQLJSON)
    async updatePmGovernanceDecision(
        @Args('id', { type: () => ID }) id: string,
        @Args('title', { nullable: true }) title?: string,
        @Args('decisionNumber', { nullable: true }) decisionNumber?: string,
        @Args('description', { nullable: true }) description?: string,
        @Args('category', { nullable: true }) category?: string,
        @Args('decision', { nullable: true }) decision?: string,
        @Args('decidedBy', { nullable: true }) decidedBy?: string,
        @Args('decisionDate', { nullable: true }) decisionDate?: string,
        @Args('escalationLevel', { nullable: true }) escalationLevel?: string,
        @Args('impact', { nullable: true }) impact?: string,
        @Args('followUpActions', { nullable: true }) followUpActions?: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('dueDate', { nullable: true }) dueDate?: string,
    ) {
        return this.pmService.updateGovernanceDecision(id, {
            title, decisionNumber, description, category, decision,
            decidedBy, decisionDate, escalationLevel, impact, followUpActions, status, dueDate,
        });
    }

    @Mutation(() => Boolean)
    async deletePmGovernanceDecision(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteGovernanceDecision(id);
    }

    // ══════════════════════════════════════════════════════════
    // ─── PMBOK 8: SUSTAINABILITY ────────────────────────────
    // ══════════════════════════════════════════════════════════

    @Query(() => GraphQLJSON)
    async pmSustainabilityMetrics(@Args('projectId') projectId: string) {
        return this.pmService.getSustainabilityMetrics(projectId);
    }

    @Mutation(() => GraphQLJSON)
    async createPmSustainabilityMetric(
        @Args('tenantId') tenantId: string,
        @Args('projectId') projectId: string,
        @Args('dimension') dimension: string,
        @Args('metricName') metricName: string,
        @Args('description', { nullable: true }) description?: string,
        @Args('unit', { nullable: true }) unit?: string,
        @Args('targetValue', { type: () => Float, nullable: true }) targetValue?: number,
        @Args('actualValue', { type: () => Float, nullable: true }) actualValue?: number,
        @Args('baselineValue', { type: () => Float, nullable: true }) baselineValue?: number,
        @Args('measurementPeriod', { nullable: true }) measurementPeriod?: string,
        @Args('dataSource', { nullable: true }) dataSource?: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('notes', { nullable: true }) notes?: string,
    ) {
        return this.pmService.createSustainabilityMetric(tenantId, {
            projectId, dimension, metricName, description, unit,
            targetValue, actualValue, baselineValue, measurementPeriod, dataSource, status, notes,
        });
    }

    @Mutation(() => GraphQLJSON)
    async updatePmSustainabilityMetric(
        @Args('id', { type: () => ID }) id: string,
        @Args('dimension', { nullable: true }) dimension?: string,
        @Args('metricName', { nullable: true }) metricName?: string,
        @Args('description', { nullable: true }) description?: string,
        @Args('unit', { nullable: true }) unit?: string,
        @Args('targetValue', { type: () => Float, nullable: true }) targetValue?: number,
        @Args('actualValue', { type: () => Float, nullable: true }) actualValue?: number,
        @Args('baselineValue', { type: () => Float, nullable: true }) baselineValue?: number,
        @Args('measurementPeriod', { nullable: true }) measurementPeriod?: string,
        @Args('dataSource', { nullable: true }) dataSource?: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('notes', { nullable: true }) notes?: string,
    ) {
        return this.pmService.updateSustainabilityMetric(id, {
            dimension, metricName, description, unit,
            targetValue, actualValue, baselineValue, measurementPeriod, dataSource, status, notes,
        });
    }

    @Mutation(() => Boolean)
    async deletePmSustainabilityMetric(@Args('id', { type: () => ID }) id: string) {
        return this.pmService.deleteSustainabilityMetric(id);
    }

    @Query(() => GraphQLJSON)
    async generateSustainabilityImpact(@Args('projectId') projectId: string) {
        return this.pmService.generateSustainabilityImpact(projectId);
    }

    // ══════════════════════════════════════════════════════════
    // ─── PORTFOLIO & KNOWLEDGE BASE ─────────────────────────
    // ══════════════════════════════════════════════════════════

    @Query(() => GraphQLJSON)
    async pmPortfolioSummary(@Args('tenantId') tenantId: string) {
        return this.pmService.getPortfolioSummary(tenantId);
    }

    @Query(() => GraphQLJSON)
    async pmAllLessonsLearned(@Args('tenantId') tenantId: string) {
        return this.pmService.getAllLessonsLearned(tenantId);
    }

    // ══════════════════════════════════════════════════════════
    // ─── AI GENERATORS ───────────────────────────────────────
    // ══════════════════════════════════════════════════════════

    @Query(() => GraphQLJSON)
    async generateStatusReport(@Args('projectId') projectId: string) {
        return this.pmService.generateStatusReport(projectId);
    }

    @Query(() => GraphQLJSON)
    async generateCriticalPath(@Args('projectId') projectId: string) {
        return this.pmService.generateCriticalPath(projectId);
    }

    @Query(() => GraphQLJSON)
    async generatePortfolioAnalysis(@Args('tenantId') tenantId: string) {
        return this.pmService.generatePortfolioAnalysis(tenantId);
    }

    /** Backlog UI expects pmMembers; v1 returns empty until tenant_users roster is wired (D-25). */
    @Query(() => [GraphQLJSON])
    async pmMembers(@Args('tenantId') _tenantId: string) {
        return [];
    }
}

