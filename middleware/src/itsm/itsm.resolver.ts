import { Resolver, Query, Mutation, Args, ObjectType, Field, ID, InputType, Int } from '@nestjs/graphql';
import { ItsmService } from './itsm.service';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â”€â”€â”€ GRAPHQL OBJECT TYPES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@ObjectType()
export class ItsmCategory {
    @Field(() => ID) id: string;
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) parentId?: string;
    @Field({ nullable: true }) icon?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) createdAt?: string;
}

@ObjectType()
export class ItsmSlaPolicy {
    @Field(() => ID) id: string;
    @Field() name: string;
    @Field() priority: string;
    @Field(() => Int) responseTimeMinutes: number;
    @Field(() => Int) resolutionTimeMinutes: number;
    @Field(() => Int, { nullable: true }) escalationAfterMinutes?: number;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) createdAt?: string;
}

@ObjectType()
export class ItsmTicket {
    @Field(() => ID) id: string;
    @Field({ nullable: true }) ticketNumber?: string;
    @Field() title: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) categoryId?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) impact?: string;
    @Field({ nullable: true }) urgency?: string;
    @Field({ nullable: true }) contactId?: string;
    @Field({ nullable: true }) accountId?: string;
    @Field({ nullable: true }) individualId?: string;
    @Field({ nullable: true }) pmStakeholderId?: string;
    @Field({ nullable: true }) reporterName?: string;
    @Field({ nullable: true }) reporterEmail?: string;
    @Field({ nullable: true }) assignedTo?: string;
    @Field({ nullable: true }) assignedGroup?: string;
    @Field({ nullable: true }) slaPolicyId?: string;
    @Field({ nullable: true }) slaResponseDue?: string;
    @Field({ nullable: true }) slaResolutionDue?: string;
    @Field({ nullable: true }) slaResponseMet?: boolean;
    @Field({ nullable: true }) slaResolutionMet?: boolean;
    @Field({ nullable: true }) channel?: string;
    @Field({ nullable: true }) resolutionNotes?: string;
    @Field({ nullable: true }) resolvedAt?: string;
    @Field({ nullable: true }) closedAt?: string;
    @Field({ nullable: true }) createdAt?: string;
    @Field({ nullable: true }) updatedAt?: string;
}

@ObjectType()
export class ItsmTicketComment {
    @Field(() => ID) id: string;
    @Field() ticketId: string;
    @Field({ nullable: true }) author?: string;
    @Field() content: string;
    @Field() isInternal: boolean;
    @Field({ nullable: true }) createdAt?: string;
}

@ObjectType()
export class ItsmDashboardStats {
    @Field(() => Int) totalOpen: number;
    @Field(() => Int) totalUnassigned: number;
    @Field(() => Int) totalSlaBreach: number;
    @Field() avgResolutionHours: number;
    @Field(() => Int) slaCompliance: number;
    @Field(() => Int) totalTickets: number;
    @Field(() => Int) byCritical: number;
    @Field(() => Int) byHigh: number;
    @Field(() => Int) byMedium: number;
    @Field(() => Int) byLow: number;
    @Field(() => Int) statusNew: number;
    @Field(() => Int) statusOpen: number;
    @Field(() => Int) statusInProgress: number;
    @Field(() => Int) statusPending: number;
    @Field(() => Int) statusResolved: number;
    @Field(() => Int) statusClosed: number;
}

@ObjectType()
export class ItsmModuleCount {
    @Field(() => Int) total: number;
    @Field(() => Int) open: number;
    @Field(() => Int, { nullable: true }) knownErrors?: number;
    @Field(() => Int, { nullable: true }) published?: number;
}

@ObjectType()
export class ItsmModuleCounts {
    @Field(() => ItsmModuleCount) serviceRequests: ItsmModuleCount;
    @Field(() => ItsmModuleCount) problems: ItsmModuleCount;
    @Field(() => ItsmModuleCount) changes: ItsmModuleCount;
    @Field(() => ItsmModuleCount) knowledge: ItsmModuleCount;
}

@ObjectType()
export class ItsmReporterSearchResult {
    @Field() id: string;
    @Field() name: string;
    @Field({ nullable: true }) email?: string;
    @Field() type: string;
    @Field() entityId: string;
    @Field({ nullable: true }) extra?: string;
}

// â”€â”€â”€ NEW ITIL TYPES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@ObjectType()
export class ItsmPortfolioService {
    @Field(() => ID) id: string;
    @Field() serviceCode: string;
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) businessOwner?: string;
    @Field({ nullable: true }) technicalOwner?: string;
    @Field({ nullable: true }) lifecycleStatus?: string;
    @Field({ nullable: true }) serviceType?: string;
    @Field({ nullable: true }) criticality?: string;
    @Field({ nullable: true }) costCenter?: string;
    @Field({ nullable: true }) budgetAllocated?: number;
    @Field({ nullable: true }) slaTarget?: string;
    @Field({ nullable: true }) dependencies?: string;
    @Field({ nullable: true }) risks?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) publishedToCatalog?: boolean;
    @Field({ nullable: true }) publishedAt?: string;
    @Field({ nullable: true }) createdAt?: string;
}

@ObjectType()
export class ItsmCatalogItem {
    @Field(() => ID) id: string;
    @Field() catalogCode: string;
    @Field() name: string;
    @Field({ nullable: true }) shortDescription?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) portfolioServiceId?: string;
    @Field({ nullable: true }) categoryId?: string;
    @Field({ nullable: true }) icon?: string;
    @Field({ nullable: true }) estimatedDelivery?: string;
    @Field({ nullable: true }) cost?: string;
    @Field({ nullable: true }) approvalRequired?: boolean;
    @Field({ nullable: true }) approvalType?: string;
    @Field({ nullable: true }) fulfillmentGroup?: string;
    @Field({ nullable: true }) status?: string;
    @Field(() => Int, { nullable: true }) requestCount?: number;
    @Field({ nullable: true }) createdAt?: string;
}

@ObjectType()
export class ItsmServiceRequest {
    @Field(() => ID) id: string;
    @Field() requestNumber: string;
    @Field() title: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) catalogItemId?: string;
    @Field({ nullable: true }) categoryId?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) requestedFor?: string;
    @Field({ nullable: true }) requesterName?: string;
    @Field({ nullable: true }) requesterEmail?: string;
    @Field({ nullable: true }) contactId?: string;
    @Field({ nullable: true }) accountId?: string;
    @Field({ nullable: true }) fulfillmentGroup?: string;
    @Field({ nullable: true }) fulfilledBy?: string;
    @Field({ nullable: true }) fulfilledAt?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) slaDue?: string;
    @Field({ nullable: true }) createdAt?: string;
}

@ObjectType()
export class ItsmProblem {
    @Field(() => ID) id: string;
    @Field() problemNumber: string;
    @Field() title: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) categoryId?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) impact?: string;
    @Field({ nullable: true }) rootCause?: string;
    @Field({ nullable: true }) workaround?: string;
    @Field({ nullable: true }) isKnownError?: boolean;
    @Field({ nullable: true }) knowledgeArticleId?: string;
    @Field({ nullable: true }) assignedTo?: string;
    @Field({ nullable: true }) assignedGroup?: string;
    @Field({ nullable: true }) reporterName?: string;
    @Field({ nullable: true }) reporterEmail?: string;
    @Field({ nullable: true }) resolutionNotes?: string;
    @Field({ nullable: true }) resolvedAt?: string;
    @Field({ nullable: true }) closedAt?: string;
    @Field({ nullable: true }) createdAt?: string;
}

@ObjectType()
export class ItsmChange {
    @Field(() => ID) id: string;
    @Field() changeNumber: string;
    @Field() title: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) categoryId?: string;
    @Field({ nullable: true }) changeType?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) riskLevel?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) impact?: string;
    @Field({ nullable: true }) implementationPlan?: string;
    @Field({ nullable: true }) rollbackPlan?: string;
    @Field({ nullable: true }) testPlan?: string;
    @Field({ nullable: true }) scheduledStart?: string;
    @Field({ nullable: true }) scheduledEnd?: string;
    @Field({ nullable: true }) actualStart?: string;
    @Field({ nullable: true }) actualEnd?: string;
    @Field({ nullable: true }) cabRequired?: boolean;
    @Field({ nullable: true }) cabDecision?: string;
    @Field({ nullable: true }) cabNotes?: string;
    @Field({ nullable: true }) cabDate?: string;
    @Field({ nullable: true }) requestedBy?: string;
    @Field({ nullable: true }) assignedTo?: string;
    @Field({ nullable: true }) assignedGroup?: string;
    @Field({ nullable: true }) relatedIncidentId?: string;
    @Field({ nullable: true }) relatedProblemId?: string;
    @Field({ nullable: true }) reviewNotes?: string;
    @Field({ nullable: true }) createdAt?: string;
}

@ObjectType()
export class ItsmKnowledgeArticle {
    @Field(() => ID) id: string;
    @Field() articleNumber: string;
    @Field() title: string;
    @Field({ nullable: true }) content?: string;
    @Field({ nullable: true }) categoryId?: string;
    @Field({ nullable: true }) articleType?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) relatedProblemId?: string;
    @Field({ nullable: true }) author?: string;
    @Field(() => [String], { nullable: true }) tags?: string[];
    @Field(() => Int, { nullable: true }) views?: number;
    @Field(() => Int, { nullable: true }) helpfulCount?: number;
    @Field({ nullable: true }) publishedAt?: string;
    @Field({ nullable: true }) createdAt?: string;
}

@ObjectType()
export class ItsmApproval {
    @Field(() => ID) id: string;
    @Field() recordType: string;
    @Field() recordId: string;
    @Field(() => Int) approvalLevel: number;
    @Field() approverName: string;
    @Field({ nullable: true }) approverEmail?: string;
    @Field() status: string;
    @Field({ nullable: true }) decisionNotes?: string;
    @Field({ nullable: true }) decidedAt?: string;
    @Field({ nullable: true }) createdAt?: string;
}

// ═══════════════════════════════════════════════════════════
// ─── GENERIC RECORD TYPE (for new ITIL v4 modules) ──────
// ═══════════════════════════════════════════════════════════
// These modules return raw DB rows via a flexible JSON-serializable type,
// avoiding the need for dozens of per-module GraphQL types.

import { GraphQLScalarType, Kind } from 'graphql';
import { Scalar } from '@nestjs/graphql';

const GraphQLJSON = new GraphQLScalarType({
    name: 'JSON',
    description: 'The `JSON` scalar type represents JSON values as specified by ECMA-404.',
    serialize: (value: any) => value,
    parseValue: (value: any) => value,
    parseLiteral: (ast: any) => {
        if (ast.kind === Kind.STRING) { try { return JSON.parse(ast.value); } catch { return ast.value; } }
        if (ast.kind === Kind.INT) return parseInt(ast.value, 10);
        if (ast.kind === Kind.FLOAT) return parseFloat(ast.value);
        if (ast.kind === Kind.BOOLEAN) return ast.value;
        if (ast.kind === Kind.NULL) return null;
        if (ast.kind === Kind.OBJECT) {
            const obj: any = {};
            ast.fields.forEach((f: any) => { obj[f.name.value] = GraphQLJSON.parseLiteral(f.value, {}); });
            return obj;
        }
        if (ast.kind === Kind.LIST) return ast.values.map((v: any) => GraphQLJSON.parseLiteral(v, {}));
        return null;
    },
});

@ObjectType()
export class ItsmGenericRecord {
    @Field(() => ID) id: string;
    @Field({ nullable: true }) tenant_id?: string;
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) created_at?: string;
    @Field({ nullable: true }) updated_at?: string;
    // All other fields pass through as raw JSON via the admin UI's direct Supabase access
}

@InputType()
export class ItsmGenericInput {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) ciClass?: string;
    @Field({ nullable: true }) ciType?: string;
    @Field({ nullable: true }) environment?: string;
    @Field({ nullable: true }) criticality?: string;
    @Field({ nullable: true }) location?: string;
    @Field({ nullable: true }) department?: string;
    @Field({ nullable: true }) owner?: string;
    @Field({ nullable: true }) managedBy?: string;
    @Field({ nullable: true }) vendor?: string;
    @Field({ nullable: true }) manufacturer?: string;
    @Field({ nullable: true }) model?: string;
    @Field({ nullable: true }) serialNumber?: string;
    @Field({ nullable: true }) ipAddress?: string;
    @Field({ nullable: true }) macAddress?: string;
    @Field({ nullable: true }) osInfo?: string;
    @Field({ nullable: true }) version?: string;
    @Field({ nullable: true }) cpu?: string;
    @Field({ nullable: true }) memoryGb?: number;
    @Field({ nullable: true }) storageGb?: number;
    @Field({ nullable: true }) purchaseDate?: string;
    @Field({ nullable: true }) warrantyExpiry?: string;
    @Field({ nullable: true }) installDate?: string;
    @Field({ nullable: true }) endOfLife?: string;
    @Field({ nullable: true }) assetId?: string;
    @Field({ nullable: true }) serviceId?: string;
    @Field({ nullable: true }) parentCiId?: string;
    @Field({ nullable: true }) notes?: string;
    // Event fields
    @Field({ nullable: true }) source?: string;
    @Field({ nullable: true }) sourceEventId?: string;
    @Field({ nullable: true }) eventType?: string;
    @Field({ nullable: true }) severity?: string;
    @Field({ nullable: true }) category?: string;
    @Field({ nullable: true }) resourceName?: string;
    @Field({ nullable: true }) resourceType?: string;
    @Field({ nullable: true }) metricName?: string;
    @Field({ nullable: true }) metricValue?: string;
    @Field({ nullable: true }) thresholdValue?: string;
    @Field({ nullable: true }) ciId?: string;
    @Field({ nullable: true }) correlationKey?: string;
    @Field({ nullable: true }) suppressionKey?: string;
    @Field({ nullable: true }) occurredAt?: string;
    @Field({ nullable: true }) acknowledgedBy?: string;
    // Release fields
    @Field({ nullable: true }) releaseType?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) riskLevel?: string;
    @Field({ nullable: true }) plannedStart?: string;
    @Field({ nullable: true }) plannedEnd?: string;
    @Field({ nullable: true }) actualStart?: string;
    @Field({ nullable: true }) actualEnd?: string;
    @Field({ nullable: true }) buildNumber?: string;
    @Field({ nullable: true }) releaseManager?: string;
    @Field({ nullable: true }) buildTeam?: string;
    @Field({ nullable: true }) testLead?: string;
    @Field({ nullable: true }) deploymentPlan?: string;
    @Field({ nullable: true }) validationPlan?: string;
    @Field({ nullable: true }) rollbackPlan?: string;
    @Field({ nullable: true }) communicationPlan?: string;
    @Field({ nullable: true }) testResults?: string;
    @Field({ nullable: true }) deploymentNotes?: string;
    @Field({ nullable: true }) postReleaseReview?: string;
    // Agent fields
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) team?: string;
    @Field({ nullable: true }) role?: string;
    @Field({ nullable: true }) shift?: string;
    @Field({ nullable: true }) shiftStart?: string;
    @Field({ nullable: true }) shiftEnd?: string;
    @Field({ nullable: true }) timezone?: string;
    @Field(() => Int, { nullable: true }) maxTickets?: number;
    // Agent skill fields
    @Field({ nullable: true }) skillName?: string;
    @Field({ nullable: true }) proficiencyLevel?: string;
    @Field({ nullable: true }) certified?: boolean;
    @Field({ nullable: true }) certificationName?: string;
    @Field({ nullable: true }) certificationExpiry?: string;
    // Continuity plan fields
    @Field({ nullable: true }) planType?: string;
    @Field({ nullable: true }) scope?: string;
    @Field({ nullable: true }) assumptions?: string;
    @Field({ nullable: true }) rtoHours?: number;
    @Field({ nullable: true }) rpoHours?: number;
    @Field({ nullable: true }) mtpdHours?: number;
    @Field({ nullable: true }) recoveryPriority?: string;
    @Field({ nullable: true }) riskAssessment?: string;
    @Field({ nullable: true }) businessImpactAnalysis?: string;
    @Field({ nullable: true }) recoveryStrategy?: string;
    @Field({ nullable: true }) recoveryProcedures?: string;
    @Field({ nullable: true }) escalationContacts?: string;
    @Field({ nullable: true }) testFrequency?: string;
    @Field({ nullable: true }) planOwner?: string;
    @Field({ nullable: true }) approvedBy?: string;
    @Field({ nullable: true }) reviewDate?: string;
    @Field({ nullable: true }) lastTestDate?: string;
    @Field({ nullable: true }) lastTestResult?: string;
    @Field({ nullable: true }) nextTestDate?: string;
    // Availability fields
    @Field({ nullable: true }) periodStart?: string;
    @Field({ nullable: true }) periodEnd?: string;
    @Field({ nullable: true }) uptimeMinutes?: number;
    @Field({ nullable: true }) downtimeMinutes?: number;
    @Field({ nullable: true }) plannedDowntimeMinutes?: number;
    @Field({ nullable: true }) unplannedDowntimeMinutes?: number;
    @Field({ nullable: true }) mtbfHours?: number;
    @Field({ nullable: true }) mtrsHours?: number;
    @Field(() => Int, { nullable: true }) incidentCount?: number;
    @Field({ nullable: true }) slaTargetPct?: number;
    // Deployment fields
    @Field({ nullable: true }) deploymentType?: string;
    @Field({ nullable: true }) releaseId?: string;
    @Field({ nullable: true }) changeId?: string;
    @Field({ nullable: true }) deployedBy?: string;
    @Field({ nullable: true }) deploymentTeam?: string;
    @Field({ nullable: true }) deploymentSteps?: string;
    @Field({ nullable: true }) validationSteps?: string;
    @Field({ nullable: true }) rollbackSteps?: string;
    @Field({ nullable: true }) validationResult?: string;
    @Field({ nullable: true }) deploymentLog?: string;
    @Field({ nullable: true }) issuesFound?: string;
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â”€â”€â”€ INPUT TYPES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@InputType()
export class CreateItsmTicketInput {
    @Field() title: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) categoryId?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) impact?: string;
    @Field({ nullable: true }) urgency?: string;
    @Field({ nullable: true }) contactId?: string;
    @Field({ nullable: true }) accountId?: string;
    @Field({ nullable: true }) individualId?: string;
    @Field({ nullable: true }) pmStakeholderId?: string;
    @Field({ nullable: true }) reporterName?: string;
    @Field({ nullable: true }) reporterEmail?: string;
    @Field({ nullable: true }) assignedTo?: string;
    @Field({ nullable: true }) assignedGroup?: string;
    @Field({ nullable: true }) slaPolicyId?: string;
    @Field({ nullable: true }) channel?: string;
}

@InputType()
export class UpdateItsmTicketInput {
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) categoryId?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) impact?: string;
    @Field({ nullable: true }) urgency?: string;
    @Field({ nullable: true }) contactId?: string;
    @Field({ nullable: true }) accountId?: string;
    @Field({ nullable: true }) individualId?: string;
    @Field({ nullable: true }) pmStakeholderId?: string;
    @Field({ nullable: true }) reporterName?: string;
    @Field({ nullable: true }) reporterEmail?: string;
    @Field({ nullable: true }) assignedTo?: string;
    @Field({ nullable: true }) assignedGroup?: string;
    @Field({ nullable: true }) slaPolicyId?: string;
    @Field({ nullable: true }) slaResponseMet?: boolean;
    @Field({ nullable: true }) slaResolutionMet?: boolean;
    @Field({ nullable: true }) channel?: string;
    @Field({ nullable: true }) resolutionNotes?: string;
}

@InputType()
export class CreateItsmCategoryInput {
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) parentId?: string;
    @Field({ nullable: true }) icon?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
export class UpdateItsmCategoryInput {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) parentId?: string;
    @Field({ nullable: true }) icon?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
export class CreateItsmSlaPolicyInput {
    @Field() name: string;
    @Field() priority: string;
    @Field(() => Int) responseTimeMinutes: number;
    @Field(() => Int) resolutionTimeMinutes: number;
    @Field(() => Int, { nullable: true }) escalationAfterMinutes?: number;
    @Field({ nullable: true }) status?: string;
}

@InputType()
export class UpdateItsmSlaPolicyInput {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) priority?: string;
    @Field(() => Int, { nullable: true }) responseTimeMinutes?: number;
    @Field(() => Int, { nullable: true }) resolutionTimeMinutes?: number;
    @Field(() => Int, { nullable: true }) escalationAfterMinutes?: number;
    @Field({ nullable: true }) status?: string;
}

@InputType()
export class AddItsmCommentInput {
    @Field() ticketId: string;
    @Field({ nullable: true }) author?: string;
    @Field() content: string;
    @Field({ nullable: true }) isInternal?: boolean;
}

// â”€â”€â”€ NEW ITIL INPUTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@InputType() export class CreateItsmPortfolioInput {
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) businessOwner?: string;
    @Field({ nullable: true }) technicalOwner?: string;
    @Field({ nullable: true }) lifecycleStatus?: string;
    @Field({ nullable: true }) serviceType?: string;
    @Field({ nullable: true }) criticality?: string;
    @Field({ nullable: true }) costCenter?: string;
    @Field({ nullable: true }) budgetAllocated?: number;
    @Field({ nullable: true }) slaTarget?: string;
    @Field({ nullable: true }) dependencies?: string;
    @Field({ nullable: true }) risks?: string;
    @Field({ nullable: true }) notes?: string;
}
@InputType() export class UpdateItsmPortfolioInput {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) businessOwner?: string;
    @Field({ nullable: true }) technicalOwner?: string;
    @Field({ nullable: true }) lifecycleStatus?: string;
    @Field({ nullable: true }) serviceType?: string;
    @Field({ nullable: true }) criticality?: string;
    @Field({ nullable: true }) costCenter?: string;
    @Field({ nullable: true }) budgetAllocated?: number;
    @Field({ nullable: true }) slaTarget?: string;
    @Field({ nullable: true }) dependencies?: string;
    @Field({ nullable: true }) risks?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) publishedToCatalog?: boolean;
}

@InputType() export class CreateItsmCatalogInput {
    @Field() name: string;
    @Field({ nullable: true }) shortDescription?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) portfolioServiceId?: string;
    @Field({ nullable: true }) categoryId?: string;
    @Field({ nullable: true }) icon?: string;
    @Field({ nullable: true }) estimatedDelivery?: string;
    @Field({ nullable: true }) cost?: string;
    @Field({ nullable: true }) approvalRequired?: boolean;
    @Field({ nullable: true }) approvalType?: string;
    @Field({ nullable: true }) fulfillmentGroup?: string;
    @Field({ nullable: true }) status?: string;
}
@InputType() export class UpdateItsmCatalogInput {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) shortDescription?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) categoryId?: string;
    @Field({ nullable: true }) icon?: string;
    @Field({ nullable: true }) estimatedDelivery?: string;
    @Field({ nullable: true }) cost?: string;
    @Field({ nullable: true }) approvalRequired?: boolean;
    @Field({ nullable: true }) approvalType?: string;
    @Field({ nullable: true }) fulfillmentGroup?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType() export class CreateItsmServiceRequestInput {
    @Field() title: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) catalogItemId?: string;
    @Field({ nullable: true }) categoryId?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) requestedFor?: string;
    @Field({ nullable: true }) requesterName?: string;
    @Field({ nullable: true }) requesterEmail?: string;
    @Field({ nullable: true }) contactId?: string;
    @Field({ nullable: true }) accountId?: string;
    @Field({ nullable: true }) fulfillmentGroup?: string;
}
@InputType() export class UpdateItsmServiceRequestInput {
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) catalogItemId?: string;
    @Field({ nullable: true }) categoryId?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) requestedFor?: string;
    @Field({ nullable: true }) requesterName?: string;
    @Field({ nullable: true }) requesterEmail?: string;
    @Field({ nullable: true }) fulfillmentGroup?: string;
    @Field({ nullable: true }) fulfilledBy?: string;
    @Field({ nullable: true }) notes?: string;
}

@InputType() export class CreateItsmProblemInput {
    @Field() title: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) categoryId?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) impact?: string;
    @Field({ nullable: true }) assignedTo?: string;
    @Field({ nullable: true }) assignedGroup?: string;
    @Field({ nullable: true }) reporterName?: string;
    @Field({ nullable: true }) reporterEmail?: string;
}
@InputType() export class UpdateItsmProblemInput {
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) categoryId?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) impact?: string;
    @Field({ nullable: true }) rootCause?: string;
    @Field({ nullable: true }) workaround?: string;
    @Field({ nullable: true }) isKnownError?: boolean;
    @Field({ nullable: true }) knowledgeArticleId?: string;
    @Field({ nullable: true }) assignedTo?: string;
    @Field({ nullable: true }) assignedGroup?: string;
    @Field({ nullable: true }) resolutionNotes?: string;
}

@InputType() export class CreateItsmChangeInput {
    @Field() title: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) categoryId?: string;
    @Field({ nullable: true }) changeType?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) riskLevel?: string;
    @Field({ nullable: true }) impact?: string;
    @Field({ nullable: true }) implementationPlan?: string;
    @Field({ nullable: true }) rollbackPlan?: string;
    @Field({ nullable: true }) testPlan?: string;
    @Field({ nullable: true }) scheduledStart?: string;
    @Field({ nullable: true }) scheduledEnd?: string;
    @Field({ nullable: true }) cabRequired?: boolean;
    @Field({ nullable: true }) requestedBy?: string;
    @Field({ nullable: true }) assignedTo?: string;
    @Field({ nullable: true }) assignedGroup?: string;
    @Field({ nullable: true }) relatedIncidentId?: string;
    @Field({ nullable: true }) relatedProblemId?: string;
}
@InputType() export class UpdateItsmChangeInput {
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) categoryId?: string;
    @Field({ nullable: true }) changeType?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) riskLevel?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) impact?: string;
    @Field({ nullable: true }) implementationPlan?: string;
    @Field({ nullable: true }) rollbackPlan?: string;
    @Field({ nullable: true }) testPlan?: string;
    @Field({ nullable: true }) scheduledStart?: string;
    @Field({ nullable: true }) scheduledEnd?: string;
    @Field({ nullable: true }) actualStart?: string;
    @Field({ nullable: true }) actualEnd?: string;
    @Field({ nullable: true }) cabRequired?: boolean;
    @Field({ nullable: true }) cabDecision?: string;
    @Field({ nullable: true }) cabNotes?: string;
    @Field({ nullable: true }) cabDate?: string;
    @Field({ nullable: true }) requestedBy?: string;
    @Field({ nullable: true }) assignedTo?: string;
    @Field({ nullable: true }) assignedGroup?: string;
    @Field({ nullable: true }) reviewNotes?: string;
}

@InputType() export class CreateItsmKnowledgeInput {
    @Field() title: string;
    @Field({ nullable: true }) content?: string;
    @Field({ nullable: true }) categoryId?: string;
    @Field({ nullable: true }) articleType?: string;
    @Field({ nullable: true }) relatedProblemId?: string;
    @Field({ nullable: true }) author?: string;
    @Field(() => [String], { nullable: true }) tags?: string[];
}
@InputType() export class UpdateItsmKnowledgeInput {
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) content?: string;
    @Field({ nullable: true }) categoryId?: string;
    @Field({ nullable: true }) articleType?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) relatedProblemId?: string;
    @Field({ nullable: true }) author?: string;
    @Field(() => [String], { nullable: true }) tags?: string[];
}

@InputType() export class CreateItsmApprovalInput {
    @Field() recordType: string;
    @Field() recordId: string;
    @Field(() => Int, { nullable: true }) approvalLevel?: number;
    @Field() approverName: string;
    @Field({ nullable: true }) approverEmail?: string;
}

@InputType() export class PublishToCatalogInput {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) shortDescription?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) categoryId?: string;
    @Field({ nullable: true }) icon?: string;
    @Field({ nullable: true }) estimatedDelivery?: string;
    @Field({ nullable: true }) cost?: string;
    @Field({ nullable: true }) approvalRequired?: boolean;
    @Field({ nullable: true }) approvalType?: string;
    @Field({ nullable: true }) fulfillmentGroup?: string;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â”€â”€â”€ MAPPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function mapTicket(row: any): ItsmTicket {
    return {
        id: row.id, ticketNumber: row.ticket_number, title: row.title,
        description: row.description, categoryId: row.category_id,
        priority: row.priority, status: row.status, impact: row.impact,
        urgency: row.urgency, contactId: row.contact_id, accountId: row.account_id,
        individualId: row.individual_id, pmStakeholderId: row.pm_stakeholder_id,
        reporterName: row.reporter_name, reporterEmail: row.reporter_email,
        assignedTo: row.assigned_to, assignedGroup: row.assigned_group,
        slaPolicyId: row.sla_policy_id, slaResponseDue: row.sla_response_due,
        slaResolutionDue: row.sla_resolution_due, slaResponseMet: row.sla_response_met,
        slaResolutionMet: row.sla_resolution_met, channel: row.channel,
        resolutionNotes: row.resolution_notes, resolvedAt: row.resolved_at,
        closedAt: row.closed_at, createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapCategory(row: any): ItsmCategory {
    return { id: row.id, name: row.name, description: row.description, parentId: row.parent_id, icon: row.icon, status: row.status, createdAt: row.created_at };
}

function mapSlaPolicy(row: any): ItsmSlaPolicy {
    return { id: row.id, name: row.name, priority: row.priority, responseTimeMinutes: row.response_time_minutes, resolutionTimeMinutes: row.resolution_time_minutes, escalationAfterMinutes: row.escalation_after_minutes, status: row.status, createdAt: row.created_at };
}

function mapComment(row: any): ItsmTicketComment {
    return { id: row.id, ticketId: row.ticket_id, author: row.author, content: row.content, isInternal: row.is_internal, createdAt: row.created_at };
}

function mapPortfolio(r: any): ItsmPortfolioService {
    return { id: r.id, serviceCode: r.service_code, name: r.name, description: r.description, businessOwner: r.business_owner, technicalOwner: r.technical_owner, lifecycleStatus: r.lifecycle_status, serviceType: r.service_type, criticality: r.criticality, costCenter: r.cost_center, budgetAllocated: r.budget_allocated, slaTarget: r.sla_target, dependencies: r.dependencies, risks: r.risks, notes: r.notes, publishedToCatalog: r.published_to_catalog, publishedAt: r.published_at, createdAt: r.created_at };
}

function mapCatalog(r: any): ItsmCatalogItem {
    return { id: r.id, catalogCode: r.catalog_code, name: r.name, shortDescription: r.short_description, description: r.description, portfolioServiceId: r.portfolio_service_id, categoryId: r.category_id, icon: r.icon, estimatedDelivery: r.estimated_delivery, cost: r.cost, approvalRequired: r.approval_required, approvalType: r.approval_type, fulfillmentGroup: r.fulfillment_group, status: r.status, requestCount: r.request_count, createdAt: r.created_at };
}

function mapServiceRequest(r: any): ItsmServiceRequest {
    return { id: r.id, requestNumber: r.request_number, title: r.title, description: r.description, catalogItemId: r.catalog_item_id, categoryId: r.category_id, priority: r.priority, status: r.status, requestedFor: r.requested_for, requesterName: r.requester_name, requesterEmail: r.requester_email, contactId: r.contact_id, accountId: r.account_id, fulfillmentGroup: r.fulfillment_group, fulfilledBy: r.fulfilled_by, fulfilledAt: r.fulfilled_at, notes: r.notes, slaDue: r.sla_due, createdAt: r.created_at };
}

function mapProblem(r: any): ItsmProblem {
    return { id: r.id, problemNumber: r.problem_number, title: r.title, description: r.description, categoryId: r.category_id, priority: r.priority, status: r.status, impact: r.impact, rootCause: r.root_cause, workaround: r.workaround, isKnownError: r.is_known_error, knowledgeArticleId: r.knowledge_article_id, assignedTo: r.assigned_to, assignedGroup: r.assigned_group, reporterName: r.reporter_name, reporterEmail: r.reporter_email, resolutionNotes: r.resolution_notes, resolvedAt: r.resolved_at, closedAt: r.closed_at, createdAt: r.created_at };
}

function mapChange(r: any): ItsmChange {
    return { id: r.id, changeNumber: r.change_number, title: r.title, description: r.description, categoryId: r.category_id, changeType: r.change_type, priority: r.priority, riskLevel: r.risk_level, status: r.status, impact: r.impact, implementationPlan: r.implementation_plan, rollbackPlan: r.rollback_plan, testPlan: r.test_plan, scheduledStart: r.scheduled_start, scheduledEnd: r.scheduled_end, actualStart: r.actual_start, actualEnd: r.actual_end, cabRequired: r.cab_required, cabDecision: r.cab_decision, cabNotes: r.cab_notes, cabDate: r.cab_date, requestedBy: r.requested_by, assignedTo: r.assigned_to, assignedGroup: r.assigned_group, relatedIncidentId: r.related_incident_id, relatedProblemId: r.related_problem_id, reviewNotes: r.review_notes, createdAt: r.created_at };
}

function mapKnowledge(r: any): ItsmKnowledgeArticle {
    return { id: r.id, articleNumber: r.article_number, title: r.title, content: r.content, categoryId: r.category_id, articleType: r.article_type, status: r.status, relatedProblemId: r.related_problem_id, author: r.author, tags: r.tags, views: r.views, helpfulCount: r.helpful_count, publishedAt: r.published_at, createdAt: r.created_at };
}

function mapApproval(r: any): ItsmApproval {
    return { id: r.id, recordType: r.record_type, recordId: r.record_id, approvalLevel: r.approval_level, approverName: r.approver_name, approverEmail: r.approver_email, status: r.status, decisionNotes: r.decision_notes, decidedAt: r.decided_at, createdAt: r.created_at };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â”€â”€â”€ RESOLVER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@Resolver()
export class ItsmResolver {
    constructor(private itsmService: ItsmService) {}

    // â”€â”€ TICKETS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Query(() => [ItsmTicket])
    async itsmTickets(
        @Args('status', { nullable: true }) status?: string,
        @Args('priority', { nullable: true }) priority?: string,
        @Args('categoryId', { nullable: true }) categoryId?: string,
        @Args('assignedTo', { nullable: true }) assignedTo?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        const rows = await this.itsmService.getTickets({ status, priority, categoryId, assignedTo, search });
        return rows.map(mapTicket);
    }

    @Query(() => ItsmTicket, { nullable: true })
    async itsmTicket(@Args('id') id: string) {
        const row = await this.itsmService.getTicketById(id);
        return row ? mapTicket(row) : null;
    }

    @Mutation(() => ItsmTicket)
    async createItsmTicket(@Args('tenantId') tenantId: string, @Args('input') input: CreateItsmTicketInput) {
        const row = await this.itsmService.createTicket(tenantId, input);
        return mapTicket(row);
    }

    @Mutation(() => ItsmTicket)
    async updateItsmTicket(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdateItsmTicketInput) {
        const row = await this.itsmService.updateTicket(id, input);
        return mapTicket(row);
    }

    @Mutation(() => Boolean)
    async deleteItsmTicket(@Args('id', { type: () => ID }) id: string) {
        return this.itsmService.deleteTicket(id);
    }

    // â”€â”€ COMMENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Query(() => [ItsmTicketComment])
    async itsmTicketComments(@Args('ticketId') ticketId: string) {
        const rows = await this.itsmService.getComments(ticketId);
        return rows.map(mapComment);
    }

    @Mutation(() => ItsmTicketComment)
    async addItsmComment(@Args('input') input: AddItsmCommentInput) {
        const row = await this.itsmService.addComment(input);
        return mapComment(row);
    }

    // â”€â”€ CATEGORIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Query(() => [ItsmCategory])
    async itsmCategories() {
        const rows = await this.itsmService.getCategories();
        return rows.map(mapCategory);
    }

    @Mutation(() => ItsmCategory)
    async createItsmCategory(@Args('tenantId') tenantId: string, @Args('input') input: CreateItsmCategoryInput) {
        const row = await this.itsmService.createCategory(tenantId, input);
        return mapCategory(row);
    }

    @Mutation(() => ItsmCategory)
    async updateItsmCategory(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdateItsmCategoryInput) {
        const row = await this.itsmService.updateCategory(id, input);
        return mapCategory(row);
    }

    @Mutation(() => Boolean)
    async deleteItsmCategory(@Args('id', { type: () => ID }) id: string) {
        return this.itsmService.deleteCategory(id);
    }

    // â”€â”€ SLA POLICIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Query(() => [ItsmSlaPolicy])
    async itsmSlaPolicies() {
        const rows = await this.itsmService.getSlaPolicies();
        return rows.map(mapSlaPolicy);
    }

    @Mutation(() => ItsmSlaPolicy)
    async createItsmSlaPolicy(@Args('tenantId') tenantId: string, @Args('input') input: CreateItsmSlaPolicyInput) {
        const row = await this.itsmService.createSlaPolicy(tenantId, input);
        return mapSlaPolicy(row);
    }

    @Mutation(() => ItsmSlaPolicy)
    async updateItsmSlaPolicy(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdateItsmSlaPolicyInput) {
        const row = await this.itsmService.updateSlaPolicy(id, input);
        return mapSlaPolicy(row);
    }

    @Mutation(() => Boolean)
    async deleteItsmSlaPolicy(@Args('id', { type: () => ID }) id: string) {
        return this.itsmService.deleteSlaPolicy(id);
    }

    // â”€â”€ DASHBOARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Query(() => ItsmDashboardStats)
    async itsmDashboardStats() {
        const stats = await this.itsmService.getDashboardStats();
        return {
            totalOpen: stats.totalOpen, totalUnassigned: stats.totalUnassigned,
            totalSlaBreach: stats.totalSlaBreach, avgResolutionHours: stats.avgResolutionHours,
            slaCompliance: stats.slaCompliance, totalTickets: stats.totalTickets,
            byCritical: stats.byPriority.critical, byHigh: stats.byPriority.high,
            byMedium: stats.byPriority.medium, byLow: stats.byPriority.low,
            statusNew: stats.byStatus.new, statusOpen: stats.byStatus.open,
            statusInProgress: stats.byStatus.in_progress, statusPending: stats.byStatus.pending,
            statusResolved: stats.byStatus.resolved, statusClosed: stats.byStatus.closed,
        };
    }

    @Query(() => ItsmModuleCounts)
    async itsmModuleCounts() {
        return this.itsmService.getModuleCounts();
    }

    // ── REPORTER SEARCH ────────────────────────────────────────

    @Query(() => [ItsmReporterSearchResult])
    async itsmSearchReporters(@Args('search') search: string) {
        return this.itsmService.searchReporters(search);
    }

    // â”€â”€ AI-POWERED FEATURES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Query(() => String)
    async itsmAiCategorize(
        @Args('title') title: string,
        @Args('description', { nullable: true }) description?: string,
    ) {
        const result = await this.itsmService.aiCategorizeTicket(title, description || '');
        return JSON.stringify(result);
    }

    @Query(() => String)
    async itsmAiSuggestResolution(@Args('ticketId') ticketId: string) {
        const result = await this.itsmService.aiSuggestResolution(ticketId);
        return JSON.stringify(result);
    }

    @Query(() => String)
    async itsmAiSlaRisk(@Args('ticketId') ticketId: string) {
        const result = await this.itsmService.aiAnalyzeSlaRisk(ticketId);
        return JSON.stringify(result);
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // â”€â”€ SERVICE PORTFOLIO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    @Query(() => [ItsmPortfolioService])
    async itsmPortfolioServices(
        @Args('lifecycleStatus', { nullable: true }) lifecycleStatus?: string,
        @Args('serviceType', { nullable: true }) serviceType?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        return (await this.itsmService.getPortfolioServices({ lifecycleStatus, serviceType, search })).map(mapPortfolio);
    }

    @Mutation(() => ItsmPortfolioService)
    async createItsmPortfolioService(@Args('tenantId') tenantId: string, @Args('input') input: CreateItsmPortfolioInput) {
        return mapPortfolio(await this.itsmService.createPortfolioService(tenantId, input));
    }

    @Mutation(() => ItsmPortfolioService)
    async updateItsmPortfolioService(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdateItsmPortfolioInput) {
        return mapPortfolio(await this.itsmService.updatePortfolioService(id, input));
    }

    @Mutation(() => Boolean)
    async deleteItsmPortfolioService(@Args('id', { type: () => ID }) id: string) {
        return this.itsmService.deletePortfolioService(id);
    }

    @Mutation(() => ItsmCatalogItem)
    async itsmPublishToCatalog(@Args('portfolioId') portfolioId: string, @Args('input') input: PublishToCatalogInput) {
        return mapCatalog(await this.itsmService.publishToCatalog(portfolioId, input));
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // â”€â”€ SERVICE CATALOG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    @Query(() => [ItsmCatalogItem])
    async itsmCatalogItems(
        @Args('status', { nullable: true }) status?: string,
        @Args('categoryId', { nullable: true }) categoryId?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        return (await this.itsmService.getCatalogItems({ status, categoryId, search })).map(mapCatalog);
    }

    @Mutation(() => ItsmCatalogItem)
    async createItsmCatalogItem(@Args('tenantId') tenantId: string, @Args('input') input: CreateItsmCatalogInput) {
        return mapCatalog(await this.itsmService.createCatalogItem(tenantId, input));
    }

    @Mutation(() => ItsmCatalogItem)
    async updateItsmCatalogItem(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdateItsmCatalogInput) {
        return mapCatalog(await this.itsmService.updateCatalogItem(id, input));
    }

    @Mutation(() => Boolean)
    async deleteItsmCatalogItem(@Args('id', { type: () => ID }) id: string) {
        return this.itsmService.deleteCatalogItem(id);
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // â”€â”€ SERVICE REQUESTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    @Query(() => [ItsmServiceRequest])
    async itsmServiceRequests(
        @Args('status', { nullable: true }) status?: string,
        @Args('priority', { nullable: true }) priority?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        return (await this.itsmService.getServiceRequests({ status, priority, search })).map(mapServiceRequest);
    }

    @Mutation(() => ItsmServiceRequest)
    async createItsmServiceRequest(@Args('tenantId') tenantId: string, @Args('input') input: CreateItsmServiceRequestInput) {
        return mapServiceRequest(await this.itsmService.createServiceRequest(tenantId, input));
    }

    @Mutation(() => ItsmServiceRequest)
    async updateItsmServiceRequest(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdateItsmServiceRequestInput) {
        return mapServiceRequest(await this.itsmService.updateServiceRequest(id, input));
    }

    @Mutation(() => Boolean)
    async deleteItsmServiceRequest(@Args('id', { type: () => ID }) id: string) {
        return this.itsmService.deleteServiceRequest(id);
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // â”€â”€ PROBLEMS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    @Query(() => [ItsmProblem])
    async itsmProblems(
        @Args('status', { nullable: true }) status?: string,
        @Args('priority', { nullable: true }) priority?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        return (await this.itsmService.getProblems({ status, priority, search })).map(mapProblem);
    }

    @Mutation(() => ItsmProblem)
    async createItsmProblem(@Args('tenantId') tenantId: string, @Args('input') input: CreateItsmProblemInput) {
        return mapProblem(await this.itsmService.createProblem(tenantId, input));
    }

    @Mutation(() => ItsmProblem)
    async updateItsmProblem(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdateItsmProblemInput) {
        return mapProblem(await this.itsmService.updateProblem(id, input));
    }

    @Mutation(() => Boolean)
    async deleteItsmProblem(@Args('id', { type: () => ID }) id: string) {
        return this.itsmService.deleteProblem(id);
    }

    @Mutation(() => Boolean)
    async itsmLinkProblemIncident(@Args('problemId') problemId: string, @Args('incidentId') incidentId: string) {
        await this.itsmService.linkProblemIncident(problemId, incidentId);
        return true;
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // â”€â”€ CHANGES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    @Query(() => [ItsmChange])
    async itsmChanges(
        @Args('status', { nullable: true }) status?: string,
        @Args('changeType', { nullable: true }) changeType?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        return (await this.itsmService.getChanges({ status, changeType, search })).map(mapChange);
    }

    @Mutation(() => ItsmChange)
    async createItsmChange(@Args('tenantId') tenantId: string, @Args('input') input: CreateItsmChangeInput) {
        return mapChange(await this.itsmService.createChange(tenantId, input));
    }

    @Mutation(() => ItsmChange)
    async updateItsmChange(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdateItsmChangeInput) {
        return mapChange(await this.itsmService.updateChange(id, input));
    }

    @Mutation(() => Boolean)
    async deleteItsmChange(@Args('id', { type: () => ID }) id: string) {
        return this.itsmService.deleteChange(id);
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // â”€â”€ KNOWLEDGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    @Query(() => [ItsmKnowledgeArticle])
    async itsmKnowledgeArticles(
        @Args('status', { nullable: true }) status?: string,
        @Args('articleType', { nullable: true }) articleType?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        return (await this.itsmService.getKnowledgeArticles({ status, articleType, search })).map(mapKnowledge);
    }

    @Mutation(() => ItsmKnowledgeArticle)
    async createItsmKnowledgeArticle(@Args('tenantId') tenantId: string, @Args('input') input: CreateItsmKnowledgeInput) {
        return mapKnowledge(await this.itsmService.createKnowledgeArticle(tenantId, input));
    }

    @Mutation(() => ItsmKnowledgeArticle)
    async updateItsmKnowledgeArticle(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdateItsmKnowledgeInput) {
        return mapKnowledge(await this.itsmService.updateKnowledgeArticle(id, input));
    }

    @Mutation(() => Boolean)
    async deleteItsmKnowledgeArticle(@Args('id', { type: () => ID }) id: string) {
        return this.itsmService.deleteKnowledgeArticle(id);
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // â”€â”€ APPROVALS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    @Query(() => [ItsmApproval])
    async itsmApprovals(@Args('recordType') recordType: string, @Args('recordId') recordId: string) {
        return (await this.itsmService.getApprovals(recordType, recordId)).map(mapApproval);
    }

    @Mutation(() => ItsmApproval)
    async createItsmApproval(@Args('tenantId') tenantId: string, @Args('input') input: CreateItsmApprovalInput) {
        return mapApproval(await this.itsmService.createApproval(tenantId, input));
    }

    @Mutation(() => ItsmApproval)
    async decideItsmApproval(
        @Args('id', { type: () => ID }) id: string,
        @Args('status') status: string,
        @Args('notes', { nullable: true }) notes?: string,
    ) {
        return mapApproval(await this.itsmService.decideApproval(id, status, notes));
    }

    // ══════════════════════════════════════════════════════════
    // ── CMDB — CONFIGURATION ITEMS ──────────────────────────
    // ══════════════════════════════════════════════════════════

    @Query(() => [ItsmGenericRecord])
    async itsmConfigurationItems(
        @Args('ciClass', { nullable: true }) ciClass?: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('environment', { nullable: true }) environment?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        return this.itsmService.getConfigurationItems({ ciClass, status, environment, search });
    }

    @Query(() => ItsmGenericRecord, { nullable: true })
    async itsmConfigurationItem(@Args('id') id: string) {
        return this.itsmService.getConfigurationItemById(id);
    }

    @Mutation(() => ItsmGenericRecord)
    async createItsmConfigurationItem(@Args('tenantId') tenantId: string, @Args('input') input: ItsmGenericInput) {
        return this.itsmService.createConfigurationItem(tenantId, input);
    }

    @Mutation(() => ItsmGenericRecord)
    async updateItsmConfigurationItem(@Args('id', { type: () => ID }) id: string, @Args('input') input: ItsmGenericInput) {
        return this.itsmService.updateConfigurationItem(id, input);
    }

    @Mutation(() => Boolean)
    async deleteItsmConfigurationItem(@Args('id', { type: () => ID }) id: string) {
        return this.itsmService.deleteConfigurationItem(id);
    }

    @Query(() => String)
    async itsmCIRelationships(@Args('ciId') ciId: string) {
        const result = await this.itsmService.getCIRelationships(ciId);
        return JSON.stringify(result);
    }

    @Mutation(() => ItsmGenericRecord)
    async addItsmCIRelationship(
        @Args('sourceCiId') sourceCiId: string,
        @Args('targetCiId') targetCiId: string,
        @Args('relationshipType') relationshipType: string,
        @Args('description', { nullable: true }) description?: string,
    ) {
        return this.itsmService.addCIRelationship(sourceCiId, targetCiId, relationshipType, description);
    }

    @Mutation(() => Boolean)
    async removeItsmCIRelationship(@Args('id', { type: () => ID }) id: string) {
        return this.itsmService.removeCIRelationship(id);
    }

    // ══════════════════════════════════════════════════════════
    // ── EVENT MANAGEMENT ────────────────────────────────────
    // ══════════════════════════════════════════════════════════

    @Query(() => [ItsmGenericRecord])
    async itsmEvents(
        @Args('status', { nullable: true }) status?: string,
        @Args('severity', { nullable: true }) severity?: string,
        @Args('eventType', { nullable: true }) eventType?: string,
        @Args('source', { nullable: true }) source?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        return this.itsmService.getEvents({ status, severity, eventType, source, search });
    }

    @Mutation(() => ItsmGenericRecord)
    async createItsmEvent(@Args('tenantId') tenantId: string, @Args('input') input: ItsmGenericInput) {
        return this.itsmService.createEvent(tenantId, input);
    }

    @Mutation(() => ItsmGenericRecord)
    async updateItsmEvent(@Args('id', { type: () => ID }) id: string, @Args('input') input: ItsmGenericInput) {
        return this.itsmService.updateEvent(id, input);
    }

    @Mutation(() => ItsmGenericRecord)
    async escalateItsmEventToIncident(@Args('eventId') eventId: string, @Args('tenantId') tenantId: string) {
        const ticket = await this.itsmService.escalateEventToIncident(eventId, tenantId);
        return mapTicket(ticket);
    }

    @Mutation(() => Boolean)
    async deleteItsmEvent(@Args('id', { type: () => ID }) id: string) {
        return this.itsmService.deleteEvent(id);
    }

    // ══════════════════════════════════════════════════════════
    // ── RELEASE MANAGEMENT ──────────────────────────────────
    // ══════════════════════════════════════════════════════════

    @Query(() => [ItsmGenericRecord])
    async itsmReleases(
        @Args('status', { nullable: true }) status?: string,
        @Args('releaseType', { nullable: true }) releaseType?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        return this.itsmService.getReleases({ status, releaseType, search });
    }

    @Mutation(() => ItsmGenericRecord)
    async createItsmRelease(@Args('tenantId') tenantId: string, @Args('input') input: ItsmGenericInput) {
        return this.itsmService.createRelease(tenantId, input);
    }

    @Mutation(() => ItsmGenericRecord)
    async updateItsmRelease(@Args('id', { type: () => ID }) id: string, @Args('input') input: ItsmGenericInput) {
        return this.itsmService.updateRelease(id, input);
    }

    @Mutation(() => Boolean)
    async deleteItsmRelease(@Args('id', { type: () => ID }) id: string) {
        return this.itsmService.deleteRelease(id);
    }

    @Query(() => [ItsmGenericRecord])
    async itsmReleaseChanges(@Args('releaseId') releaseId: string) {
        return this.itsmService.getReleaseChanges(releaseId);
    }

    @Mutation(() => ItsmGenericRecord)
    async addItsmReleaseChange(@Args('releaseId') releaseId: string, @Args('changeId') changeId: string) {
        return this.itsmService.addReleaseChange(releaseId, changeId);
    }

    @Mutation(() => Boolean)
    async removeItsmReleaseChange(@Args('id', { type: () => ID }) id: string) {
        return this.itsmService.removeReleaseChange(id);
    }

    // ══════════════════════════════════════════════════════════
    // ── WORKFORCE / AGENT MANAGEMENT ────────────────────────
    // ══════════════════════════════════════════════════════════

    @Query(() => [ItsmGenericRecord])
    async itsmAgents(
        @Args('status', { nullable: true }) status?: string,
        @Args('team', { nullable: true }) team?: string,
        @Args('role', { nullable: true }) role?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        return this.itsmService.getAgents({ status, team, role, search });
    }

    @Mutation(() => ItsmGenericRecord)
    async createItsmAgent(@Args('tenantId') tenantId: string, @Args('input') input: ItsmGenericInput) {
        return this.itsmService.createAgent(tenantId, input);
    }

    @Mutation(() => ItsmGenericRecord)
    async updateItsmAgent(@Args('id', { type: () => ID }) id: string, @Args('input') input: ItsmGenericInput) {
        return this.itsmService.updateAgent(id, input);
    }

    @Mutation(() => Boolean)
    async deleteItsmAgent(@Args('id', { type: () => ID }) id: string) {
        return this.itsmService.deleteAgent(id);
    }

    @Query(() => [ItsmGenericRecord])
    async itsmAgentSkills(@Args('agentId') agentId: string) {
        return this.itsmService.getAgentSkills(agentId);
    }

    @Mutation(() => ItsmGenericRecord)
    async addItsmAgentSkill(@Args('agentId') agentId: string, @Args('input') input: ItsmGenericInput) {
        return this.itsmService.addAgentSkill(agentId, input);
    }

    @Mutation(() => Boolean)
    async removeItsmAgentSkill(@Args('id', { type: () => ID }) id: string) {
        return this.itsmService.removeAgentSkill(id);
    }

    @Query(() => [ItsmGenericRecord])
    async itsmAgentWorkload() {
        return this.itsmService.getAgentWorkload();
    }

    // ══════════════════════════════════════════════════════════
    // ── SERVICE CONTINUITY ──────────────────────────────────
    // ══════════════════════════════════════════════════════════

    @Query(() => [ItsmGenericRecord])
    async itsmContinuityPlans(
        @Args('status', { nullable: true }) status?: string,
        @Args('planType', { nullable: true }) planType?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        return this.itsmService.getContinuityPlans({ status, planType, search });
    }

    @Mutation(() => ItsmGenericRecord)
    async createItsmContinuityPlan(@Args('tenantId') tenantId: string, @Args('input') input: ItsmGenericInput) {
        return this.itsmService.createContinuityPlan(tenantId, input);
    }

    @Mutation(() => ItsmGenericRecord)
    async updateItsmContinuityPlan(@Args('id', { type: () => ID }) id: string, @Args('input') input: ItsmGenericInput) {
        return this.itsmService.updateContinuityPlan(id, input);
    }

    @Mutation(() => Boolean)
    async deleteItsmContinuityPlan(@Args('id', { type: () => ID }) id: string) {
        return this.itsmService.deleteContinuityPlan(id);
    }

    // ══════════════════════════════════════════════════════════
    // ── AVAILABILITY MANAGEMENT ─────────────────────────────
    // ══════════════════════════════════════════════════════════

    @Query(() => [ItsmGenericRecord])
    async itsmAvailabilityRecords(
        @Args('serviceId', { nullable: true }) serviceId?: string,
        @Args('ciId', { nullable: true }) ciId?: string,
    ) {
        return this.itsmService.getAvailabilityRecords({ serviceId, ciId });
    }

    @Mutation(() => ItsmGenericRecord)
    async createItsmAvailabilityRecord(@Args('tenantId') tenantId: string, @Args('input') input: ItsmGenericInput) {
        return this.itsmService.createAvailabilityRecord(tenantId, input);
    }

    @Mutation(() => Boolean)
    async deleteItsmAvailabilityRecord(@Args('id', { type: () => ID }) id: string) {
        return this.itsmService.deleteAvailabilityRecord(id);
    }

    // ══════════════════════════════════════════════════════════
    // ── DEPLOYMENT MANAGEMENT ───────────────────────────────
    // ══════════════════════════════════════════════════════════

    @Query(() => [ItsmGenericRecord])
    async itsmDeployments(
        @Args('status', { nullable: true }) status?: string,
        @Args('environment', { nullable: true }) environment?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        return this.itsmService.getDeployments({ status, environment, search });
    }

    @Mutation(() => ItsmGenericRecord)
    async createItsmDeployment(@Args('tenantId') tenantId: string, @Args('input') input: ItsmGenericInput) {
        return this.itsmService.createDeployment(tenantId, input);
    }

    @Mutation(() => ItsmGenericRecord)
    async updateItsmDeployment(@Args('id', { type: () => ID }) id: string, @Args('input') input: ItsmGenericInput) {
        return this.itsmService.updateDeployment(id, input);
    }

    @Mutation(() => Boolean)
    async deleteItsmDeployment(@Args('id', { type: () => ID }) id: string) {
        return this.itsmService.deleteDeployment(id);
    }
}

