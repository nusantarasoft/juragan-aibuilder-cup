import { Resolver, Query, Mutation, Args, ObjectType, Field, ID, InputType, Int } from '@nestjs/graphql';
import { ItsmService } from './itsm.service';

// ═══════════════════════════════════════════════════════════
// ─── GRAPHQL OBJECT TYPES ──────────────────────────────────
// ═══════════════════════════════════════════════════════════

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
export class ItsmReporterSearchResult {
    @Field() id: string;
    @Field() name: string;
    @Field({ nullable: true }) email?: string;
    @Field() type: string;
    @Field() entityId: string;
    @Field({ nullable: true }) extra?: string;
}

// ═══════════════════════════════════════════════════════════
// ─── INPUT TYPES ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// ─── MAPPERS ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// ─── RESOLVER ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════

@Resolver()
export class ItsmResolver {
    constructor(private itsmService: ItsmService) {}

    // ── TICKETS ────────────────────────────────────────────

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

    // ── COMMENTS ───────────────────────────────────────────

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

    // ── CATEGORIES ─────────────────────────────────────────

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

    // ── SLA POLICIES ───────────────────────────────────────

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

    // ── DASHBOARD ──────────────────────────────────────────

    @Query(() => ItsmDashboardStats)
    async itsmDashboardStats() {
        const stats = await this.itsmService.getDashboardStats();
        return {
            totalOpen: stats.totalOpen,
            totalUnassigned: stats.totalUnassigned,
            totalSlaBreach: stats.totalSlaBreach,
            avgResolutionHours: stats.avgResolutionHours,
            slaCompliance: stats.slaCompliance,
            totalTickets: stats.totalTickets,
            byCritical: stats.byPriority.critical,
            byHigh: stats.byPriority.high,
            byMedium: stats.byPriority.medium,
            byLow: stats.byPriority.low,
            statusNew: stats.byStatus.new,
            statusOpen: stats.byStatus.open,
            statusInProgress: stats.byStatus.in_progress,
            statusPending: stats.byStatus.pending,
            statusResolved: stats.byStatus.resolved,
            statusClosed: stats.byStatus.closed,
        };
    }

    // ── REPORTER SEARCH ────────────────────────────────────

    @Query(() => [ItsmReporterSearchResult])
    async itsmSearchReporters(@Args('search') search: string) {
        return this.itsmService.searchReporters(search);
    }
}
