import {
    Resolver, Query, Mutation, Args,
    ObjectType, Field, ID, InputType, Float, Int,
} from '@nestjs/graphql';
import { CrmService } from './crm.service';
import GraphQLJSON from 'graphql-type-json';

// ─── GraphQL Types ──────────────────────────────────────

@ObjectType()
class Individual {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() firstName: string;
    @Field() lastName: string;
    @Field({ nullable: true }) salutation?: string;
    @Field({ nullable: true }) middleName?: string;
    @Field({ nullable: true }) suffix?: string;
    @Field({ nullable: true }) nickname?: string;
    @Field({ nullable: true }) dateOfBirth?: string;
    @Field({ nullable: true }) gender?: string;
    @Field({ nullable: true }) nationality?: string;
    @Field({ nullable: true }) preferredLanguage?: string;
    @Field({ nullable: true }) jobTitle?: string;
    @Field({ nullable: true }) department?: string;
    @Field({ nullable: true }) linkedinUrl?: string;
    @Field({ nullable: true }) twitterHandle?: string;
    @Field({ nullable: true }) website?: string;
    @Field({ nullable: true }) individualType?: string;
    @Field({ nullable: true }) source?: string;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field({ nullable: true }) avatarUrl?: string;
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) status?: string;
    @Field(() => GraphQLJSON, { nullable: true }) customFields?: any;
    @Field({ nullable: true }) leadStatus?: string;
    @Field({ nullable: true }) leadSource?: string;
    @Field({ nullable: true }) company?: string;
    @Field({ nullable: true }) ownerId?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class Account {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() name: string;
    @Field({ nullable: true }) accountNumber?: string;
    @Field({ nullable: true }) type?: string;
    @Field({ nullable: true }) industry?: string;
    @Field({ nullable: true }) website?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) fax?: string;
    @Field({ nullable: true }) email?: string;
    @Field(() => GraphQLJSON, { nullable: true }) billingAddress?: any;
    @Field(() => GraphQLJSON, { nullable: true }) shippingAddress?: any;
    @Field(() => Float, { nullable: true }) annualRevenue?: number;
    @Field(() => Int, { nullable: true }) employeeCount?: number;
    @Field({ nullable: true }) sicCode?: string;
    @Field({ nullable: true }) tickerSymbol?: string;
    @Field({ nullable: true }) ownership?: string;
    @Field({ nullable: true }) parentAccountId?: string;
    @Field({ nullable: true }) description?: string;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field(() => GraphQLJSON, { nullable: true }) customFields?: any;
    @Field({ nullable: true }) ownerId?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) rating?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class Contact {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() individualId: string;
    @Field({ nullable: true }) accountId?: string;
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) department?: string;
    @Field({ nullable: true }) role?: string;
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) mobilePhone?: string;
    @Field(() => GraphQLJSON, { nullable: true }) mailingAddress?: any;
    @Field(() => GraphQLJSON, { nullable: true }) otherAddress?: any;
    @Field({ nullable: true }) isPrimary?: boolean;
    @Field({ nullable: true }) doNotCall?: boolean;
    @Field({ nullable: true }) doNotEmail?: boolean;
    @Field({ nullable: true }) description?: string;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field(() => GraphQLJSON, { nullable: true }) customFields?: any;
    @Field({ nullable: true }) ownerId?: string;
    @Field({ nullable: true }) status?: string;
    // Joined fields
    @Field({ nullable: true }) individualFirstName?: string;
    @Field({ nullable: true }) individualLastName?: string;
    @Field({ nullable: true }) individualAvatarUrl?: string;
    @Field({ nullable: true }) individualEmail?: string;
    @Field({ nullable: true }) accountName?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

// ─── Input Types ────────────────────────────────────────

@InputType()
class CreateIndividualInput {
    @Field() firstName: string;
    @Field() lastName: string;
    @Field({ nullable: true }) salutation?: string;
    @Field({ nullable: true }) middleName?: string;
    @Field({ nullable: true }) suffix?: string;
    @Field({ nullable: true }) nickname?: string;
    @Field({ nullable: true }) dateOfBirth?: string;
    @Field({ nullable: true }) gender?: string;
    @Field({ nullable: true }) nationality?: string;
    @Field({ nullable: true }) preferredLanguage?: string;
    @Field({ nullable: true }) jobTitle?: string;
    @Field({ nullable: true }) department?: string;
    @Field({ nullable: true }) linkedinUrl?: string;
    @Field({ nullable: true }) twitterHandle?: string;
    @Field({ nullable: true }) website?: string;
    @Field({ nullable: true }) individualType?: string;
    @Field({ nullable: true }) source?: string;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field({ nullable: true }) avatarUrl?: string;
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) status?: string;
    @Field(() => GraphQLJSON, { nullable: true }) customFields?: any;
    @Field({ nullable: true }) leadStatus?: string;
    @Field({ nullable: true }) leadSource?: string;
    @Field({ nullable: true }) company?: string;
    @Field({ nullable: true }) ownerId?: string;
}

@InputType()
class UpdateIndividualInput {
    @Field({ nullable: true }) firstName?: string;
    @Field({ nullable: true }) lastName?: string;
    @Field({ nullable: true }) salutation?: string;
    @Field({ nullable: true }) middleName?: string;
    @Field({ nullable: true }) suffix?: string;
    @Field({ nullable: true }) nickname?: string;
    @Field({ nullable: true }) dateOfBirth?: string;
    @Field({ nullable: true }) gender?: string;
    @Field({ nullable: true }) nationality?: string;
    @Field({ nullable: true }) preferredLanguage?: string;
    @Field({ nullable: true }) jobTitle?: string;
    @Field({ nullable: true }) department?: string;
    @Field({ nullable: true }) linkedinUrl?: string;
    @Field({ nullable: true }) twitterHandle?: string;
    @Field({ nullable: true }) website?: string;
    @Field({ nullable: true }) individualType?: string;
    @Field({ nullable: true }) source?: string;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field({ nullable: true }) avatarUrl?: string;
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) status?: string;
    @Field(() => GraphQLJSON, { nullable: true }) customFields?: any;
    @Field({ nullable: true }) leadStatus?: string;
    @Field({ nullable: true }) leadSource?: string;
    @Field({ nullable: true }) company?: string;
    @Field({ nullable: true }) ownerId?: string;
}

@InputType()
class CreateAccountInput {
    @Field() name: string;
    @Field({ nullable: true }) accountNumber?: string;
    @Field({ nullable: true }) type?: string;
    @Field({ nullable: true }) industry?: string;
    @Field({ nullable: true }) website?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) fax?: string;
    @Field({ nullable: true }) email?: string;
    @Field(() => GraphQLJSON, { nullable: true }) billingAddress?: any;
    @Field(() => GraphQLJSON, { nullable: true }) shippingAddress?: any;
    @Field(() => Float, { nullable: true }) annualRevenue?: number;
    @Field(() => Int, { nullable: true }) employeeCount?: number;
    @Field({ nullable: true }) sicCode?: string;
    @Field({ nullable: true }) tickerSymbol?: string;
    @Field({ nullable: true }) ownership?: string;
    @Field({ nullable: true }) parentAccountId?: string;
    @Field({ nullable: true }) description?: string;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field(() => GraphQLJSON, { nullable: true }) customFields?: any;
    @Field({ nullable: true }) ownerId?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) rating?: string;
}

@InputType()
class UpdateAccountInput {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) accountNumber?: string;
    @Field({ nullable: true }) type?: string;
    @Field({ nullable: true }) industry?: string;
    @Field({ nullable: true }) website?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) fax?: string;
    @Field({ nullable: true }) email?: string;
    @Field(() => GraphQLJSON, { nullable: true }) billingAddress?: any;
    @Field(() => GraphQLJSON, { nullable: true }) shippingAddress?: any;
    @Field(() => Float, { nullable: true }) annualRevenue?: number;
    @Field(() => Int, { nullable: true }) employeeCount?: number;
    @Field({ nullable: true }) sicCode?: string;
    @Field({ nullable: true }) tickerSymbol?: string;
    @Field({ nullable: true }) ownership?: string;
    @Field({ nullable: true }) parentAccountId?: string;
    @Field({ nullable: true }) description?: string;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field(() => GraphQLJSON, { nullable: true }) customFields?: any;
    @Field({ nullable: true }) ownerId?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) rating?: string;
}

@InputType()
class CreateContactInput {
    @Field() individualId: string;
    @Field({ nullable: true }) accountId?: string;
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) department?: string;
    @Field({ nullable: true }) role?: string;
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) mobilePhone?: string;
    @Field(() => GraphQLJSON, { nullable: true }) mailingAddress?: any;
    @Field(() => GraphQLJSON, { nullable: true }) otherAddress?: any;
    @Field({ nullable: true }) isPrimary?: boolean;
    @Field({ nullable: true }) doNotCall?: boolean;
    @Field({ nullable: true }) doNotEmail?: boolean;
    @Field({ nullable: true }) description?: string;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field(() => GraphQLJSON, { nullable: true }) customFields?: any;
    @Field({ nullable: true }) ownerId?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
class UpdateContactInput {
    @Field({ nullable: true }) accountId?: string;
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) department?: string;
    @Field({ nullable: true }) role?: string;
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) mobilePhone?: string;
    @Field(() => GraphQLJSON, { nullable: true }) mailingAddress?: any;
    @Field(() => GraphQLJSON, { nullable: true }) otherAddress?: any;
    @Field({ nullable: true }) isPrimary?: boolean;
    @Field({ nullable: true }) doNotCall?: boolean;
    @Field({ nullable: true }) doNotEmail?: boolean;
    @Field({ nullable: true }) description?: string;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field(() => GraphQLJSON, { nullable: true }) customFields?: any;
    @Field({ nullable: true }) ownerId?: string;
    @Field({ nullable: true }) status?: string;
}

// ─── Activity & Note Types ──────────────────────────────

@ObjectType()
class CrmActivity {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() activityType: string;
    @Field() subject: string;
    @Field({ nullable: true }) description?: string;
    @Field() relatedToType: string;
    @Field() relatedToId: string;
    @Field({ nullable: true }) dueDate?: string;
    @Field({ nullable: true }) startTime?: string;
    @Field({ nullable: true }) endTime?: string;
    @Field({ nullable: true }) completedAt?: string;
    @Field({ nullable: true }) isCompleted?: boolean;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) outcome?: string;
    @Field({ nullable: true }) ownerId?: string;
    @Field({ nullable: true }) assignedTo?: string;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field(() => GraphQLJSON, { nullable: true }) customFields?: any;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class CrmNote {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() body: string;
    @Field({ nullable: true }) title?: string;
    @Field() relatedToType: string;
    @Field() relatedToId: string;
    @Field({ nullable: true }) isPinned?: boolean;
    @Field({ nullable: true }) ownerId?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@InputType()
class CreateActivityInput {
    @Field() activityType: string;
    @Field() subject: string;
    @Field({ nullable: true }) description?: string;
    @Field() relatedToType: string;
    @Field() relatedToId: string;
    @Field({ nullable: true }) dueDate?: string;
    @Field({ nullable: true }) startTime?: string;
    @Field({ nullable: true }) endTime?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) outcome?: string;
    @Field({ nullable: true }) ownerId?: string;
    @Field({ nullable: true }) assignedTo?: string;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field(() => GraphQLJSON, { nullable: true }) customFields?: any;
}

@InputType()
class UpdateActivityInput {
    @Field({ nullable: true }) activityType?: string;
    @Field({ nullable: true }) subject?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) dueDate?: string;
    @Field({ nullable: true }) startTime?: string;
    @Field({ nullable: true }) endTime?: string;
    @Field({ nullable: true }) completedAt?: string;
    @Field({ nullable: true }) isCompleted?: boolean;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) outcome?: string;
    @Field({ nullable: true }) ownerId?: string;
    @Field({ nullable: true }) assignedTo?: string;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field(() => GraphQLJSON, { nullable: true }) customFields?: any;
}

@InputType()
class CreateNoteInput {
    @Field() body: string;
    @Field({ nullable: true }) title?: string;
    @Field() relatedToType: string;
    @Field() relatedToId: string;
    @Field({ nullable: true }) isPinned?: boolean;
    @Field({ nullable: true }) ownerId?: string;
}

@InputType()
class UpdateNoteInput {
    @Field({ nullable: true }) body?: string;
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) isPinned?: boolean;
}

// ─── Deal Types ─────────────────────────────────────────

@ObjectType()
class Deal {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
    @Field(() => Float, { nullable: true }) amount?: number;
    @Field({ nullable: true }) currency?: string;
    @Field({ nullable: true }) stage?: string;
    @Field(() => Int, { nullable: true }) probability?: number;
    @Field({ nullable: true }) closeDate?: string;
    @Field({ nullable: true }) accountId?: string;
    @Field({ nullable: true }) contactId?: string;
    @Field({ nullable: true }) type?: string;
    @Field({ nullable: true }) leadSource?: string;
    @Field({ nullable: true }) nextStep?: string;
    @Field({ nullable: true }) lossReason?: string;
    @Field({ nullable: true }) ownerId?: string;
    @Field({ nullable: true }) status?: string;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field(() => GraphQLJSON, { nullable: true }) customFields?: any;
    // Joined
    @Field({ nullable: true }) accountName?: string;
    @Field({ nullable: true }) contactName?: string;

    @Field(() => Float, { nullable: true }) expectedRevenue?: number;
    @Field(() => [Quote], { nullable: 'itemsAndList' }) quotes?: Quote[];

    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@InputType()
class CreateDealInput {
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
    @Field(() => Float, { nullable: true }) amount?: number;
    @Field({ nullable: true }) currency?: string;
    @Field({ nullable: true }) stage?: string;
    @Field(() => Int, { nullable: true }) probability?: number;
    @Field({ nullable: true }) closeDate?: string;
    @Field({ nullable: true }) accountId?: string;
    @Field({ nullable: true }) contactId?: string;
    @Field({ nullable: true }) type?: string;
    @Field({ nullable: true }) leadSource?: string;
    @Field({ nullable: true }) nextStep?: string;
    @Field({ nullable: true }) ownerId?: string;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field(() => GraphQLJSON, { nullable: true }) customFields?: any;
}

@InputType()
class UpdateDealInput {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) description?: string;
    @Field(() => Float, { nullable: true }) amount?: number;
    @Field({ nullable: true }) currency?: string;
    @Field({ nullable: true }) stage?: string;
    @Field(() => Int, { nullable: true }) probability?: number;
    @Field({ nullable: true }) closeDate?: string;
    @Field({ nullable: true }) accountId?: string;
    @Field({ nullable: true }) contactId?: string;
    @Field({ nullable: true }) type?: string;
    @Field({ nullable: true }) leadSource?: string;
    @Field({ nullable: true }) nextStep?: string;
    @Field({ nullable: true }) lossReason?: string;
    @Field({ nullable: true }) ownerId?: string;
    @Field({ nullable: true }) status?: string;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field(() => GraphQLJSON, { nullable: true }) customFields?: any;
}

// ─── Lead Conversion Types ─────────────────────────────

@InputType()
class ConvertLeadInput {
    @Field() individualId: string;
    @Field({ nullable: true }) accountName?: string;
    @Field({ nullable: true }) accountId?: string;
    @Field({ nullable: true }) contactTitle?: string;
    @Field({ nullable: true }) contactRole?: string;
    @Field({ nullable: true }) createDeal?: boolean;
    @Field({ nullable: true }) dealName?: string;
    @Field(() => Float, { nullable: true }) dealAmount?: number;
    @Field({ nullable: true }) dealStage?: string;
    @Field({ nullable: true }) dealCloseDate?: string;
}

@ObjectType()
class ConvertLeadResult {
    @Field({ nullable: true }) accountId?: string;
    @Field() contactId: string;
    @Field({ nullable: true }) dealId?: string;
}

// ─── Campaign & Case Types ────────────────────────────

@ObjectType()
class Campaign {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() name: string;
    @Field({ nullable: true }) type?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) startDate?: string;
    @Field({ nullable: true }) endDate?: string;
    @Field(() => Float, { nullable: true }) budget?: number;
    @Field(() => Float, { nullable: true }) actualCost?: number;
    @Field(() => Float, { nullable: true }) expectedRevenue?: number;
    @Field({ nullable: true }) description?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@InputType() class CreateCampaignInput {
    @Field() name: string;
    @Field({ nullable: true }) type?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) startDate?: string;
    @Field({ nullable: true }) endDate?: string;
    @Field(() => Float, { nullable: true }) budget?: number;
    @Field(() => Float, { nullable: true }) actualCost?: number;
    @Field(() => Float, { nullable: true }) expectedRevenue?: number;
    @Field({ nullable: true }) description?: string;
}

@InputType() class UpdateCampaignInput {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) type?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) startDate?: string;
    @Field({ nullable: true }) endDate?: string;
    @Field(() => Float, { nullable: true }) budget?: number;
    @Field(() => Float, { nullable: true }) actualCost?: number;
    @Field(() => Float, { nullable: true }) expectedRevenue?: number;
    @Field({ nullable: true }) description?: string;
}

@ObjectType()
class CampaignMember {
    @Field(() => ID) id: string;
    @Field() campaignId: string;
    @Field() individualId: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) individualName?: string;
    @Field({ nullable: true }) individualEmail?: string;
    @Field() createdAt: string;
}

@ObjectType()
class SupportCase {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field({ nullable: true }) caseNumber?: string;
    @Field() subject: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) origin?: string;
    @Field({ nullable: true }) type?: string;
    @Field({ nullable: true }) contactId?: string;
    @Field({ nullable: true }) accountId?: string;
    @Field({ nullable: true }) resolution?: string;
    @Field({ nullable: true }) closedAt?: string;
    @Field({ nullable: true }) contactName?: string;
    @Field({ nullable: true }) accountName?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@InputType() class CreateCaseInput {
    @Field() subject: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) origin?: string;
    @Field({ nullable: true }) type?: string;
    @Field({ nullable: true }) contactId?: string;
    @Field({ nullable: true }) accountId?: string;
}

@InputType() class UpdateCaseInput {
    @Field({ nullable: true }) subject?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) origin?: string;
    @Field({ nullable: true }) type?: string;
    @Field({ nullable: true }) contactId?: string;
    @Field({ nullable: true }) accountId?: string;
    @Field({ nullable: true }) resolution?: string;
}

// ─── Product & Quote Types ────────────────────────────

@ObjectType()
class Product {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() name: string;
    @Field({ nullable: true }) code?: string;
    @Field({ nullable: true }) description?: string;
    @Field(() => Float) unitPrice: number;
    @Field({ nullable: true }) currency?: string;
    @Field({ nullable: true }) category?: string;
    @Field({ nullable: true }) isActive?: boolean;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@InputType() class CreateProductInput {
    @Field() name: string;
    @Field({ nullable: true }) code?: string;
    @Field({ nullable: true }) description?: string;
    @Field(() => Float) unitPrice: number;
    @Field({ nullable: true }) currency?: string;
    @Field({ nullable: true }) category?: string;
}

@InputType() class UpdateProductInput {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) code?: string;
    @Field({ nullable: true }) description?: string;
    @Field(() => Float, { nullable: true }) unitPrice?: number;
    @Field({ nullable: true }) currency?: string;
    @Field({ nullable: true }) category?: string;
    @Field({ nullable: true }) isActive?: boolean;
}

@ObjectType()
class Quote {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field({ nullable: true }) quoteNumber?: string;
    @Field() name: string;
    @Field({ nullable: true }) dealId?: string;
    @Field({ nullable: true }) accountId?: string;
    @Field({ nullable: true }) contactId?: string;
    @Field({ nullable: true }) status?: string;
    @Field(() => Float, { nullable: true }) subtotal?: number;
    @Field(() => Float, { nullable: true }) discountPercent?: number;
    @Field(() => Float, { nullable: true }) taxPercent?: number;
    @Field(() => Float, { nullable: true }) total?: number;
    @Field({ nullable: true }) validUntil?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) terms?: string;
    @Field({ nullable: true }) dealName?: string;
    @Field({ nullable: true }) accountName?: string;
    @Field({ nullable: true }) contactName?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@InputType() class CreateQuoteInput {
    @Field() name: string;
    @Field({ nullable: true }) dealId?: string;
    @Field({ nullable: true }) accountId?: string;
    @Field({ nullable: true }) contactId?: string;
    @Field(() => Float, { nullable: true }) discountPercent?: number;
    @Field(() => Float, { nullable: true }) taxPercent?: number;
    @Field({ nullable: true }) validUntil?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) terms?: string;
}

@InputType() class UpdateQuoteInput {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) dealId?: string;
    @Field({ nullable: true }) accountId?: string;
    @Field({ nullable: true }) contactId?: string;
    @Field(() => Float, { nullable: true }) discountPercent?: number;
    @Field(() => Float, { nullable: true }) taxPercent?: number;
    @Field({ nullable: true }) validUntil?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) terms?: string;
}

@ObjectType()
class QuoteItem {
    @Field(() => ID) id: string;
    @Field() quoteId: string;
    @Field({ nullable: true }) productId?: string;
    @Field() productName: string;
    @Field(() => Int) quantity: number;
    @Field(() => Float) unitPrice: number;
    @Field(() => Float, { nullable: true }) discountPercent?: number;
    @Field(() => Float) total: number;
    @Field() createdAt: string;
}

// ─── Dashboard Stats Type ─────────────────────────────

@ObjectType()
class CrmDashboardStats {
    @Field(() => Int) totalIndividuals: number;
    @Field(() => Int) totalAccounts: number;
    @Field(() => Int) totalContacts: number;
    @Field(() => Int) totalDeals: number;
    @Field(() => Int) openDeals: number;
    @Field(() => Float) pipelineValue: number;
    @Field(() => Float) wonValue: number;
    @Field(() => Int) totalActivities: number;
    @Field(() => Int) openActivities: number;
    @Field(() => Int) totalCases: number;
    @Field(() => Int) openCases: number;
    @Field(() => Int) criticalCases: number;
    @Field(() => Int) totalCampaigns: number;
    @Field(() => Int) activeCampaigns: number;
    @Field(() => Float) campaignBudget: number;
    @Field(() => Int) totalQuotes: number;
    @Field(() => Float) quotesValue: number;
    @Field(() => Int) acceptedQuotes: number;
    @Field(() => Int) totalProducts: number;
    @Field(() => Int) activeProducts: number;
}

// ─── AI Intelligence Types ───────────────────────────

@ObjectType()
class LeadScore {
    @Field() individualId: string;
    @Field() firstName: string;
    @Field() lastName: string;
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) company?: string;
    @Field({ nullable: true }) leadStatus?: string;
    @Field(() => Int) score: number;
    @Field() grade: string;
    @Field(() => [String]) factors: string[];
}

@ObjectType()
class DealInsight {
    @Field() dealId: string;
    @Field() dealName: string;
    @Field() stage: string;
    @Field(() => Float, { nullable: true }) amount?: number;
    @Field(() => Int, { nullable: true }) probability?: number;
    @Field({ nullable: true }) accountName?: string;
    @Field({ nullable: true }) contactName?: string;
    @Field({ nullable: true }) closeDate?: string;
    @Field(() => Int) daysSinceCreation: number;
    @Field() riskLevel: string;
    @Field(() => [String]) insights: string[];
    @Field() recommendation: string;
}

// ─── Helper: Map DB row to GraphQL type ─────────────────

function mapIndividual(row: any): Individual {
    return {
        id: row.id, tenantId: row.tenant_id,
        firstName: row.first_name, lastName: row.last_name,
        salutation: row.salutation, middleName: row.middle_name,
        suffix: row.suffix, nickname: row.nickname,
        dateOfBirth: row.date_of_birth, gender: row.gender,
        nationality: row.nationality, preferredLanguage: row.preferred_language,
        jobTitle: row.job_title, department: row.department,
        linkedinUrl: row.linkedin_url, twitterHandle: row.twitter_handle,
        website: row.website, individualType: row.individual_type,
        source: row.source, tags: row.tags,
        avatarUrl: row.avatar_url, email: row.email, phone: row.phone,
        status: row.status, customFields: row.custom_fields,
        leadStatus: row.lead_status, leadSource: row.lead_source,
        company: row.company, ownerId: row.owner_id,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapAccount(row: any): Account {
    return {
        id: row.id, tenantId: row.tenant_id,
        name: row.name, accountNumber: row.account_number,
        type: row.type, industry: row.industry,
        website: row.website, phone: row.phone, fax: row.fax,
        email: row.email, billingAddress: row.billing_address,
        shippingAddress: row.shipping_address,
        annualRevenue: row.annual_revenue, employeeCount: row.employee_count,
        sicCode: row.sic_code, tickerSymbol: row.ticker_symbol,
        ownership: row.ownership, parentAccountId: row.parent_account_id,
        description: row.description, tags: row.tags,
        customFields: row.custom_fields, ownerId: row.owner_id,
        status: row.status, rating: row.rating,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapContact(row: any): Contact {
    return {
        id: row.id, tenantId: row.tenant_id,
        individualId: row.individual_id, accountId: row.account_id,
        title: row.title, department: row.department, role: row.role,
        email: row.email, phone: row.phone, mobilePhone: row.mobile_phone,
        mailingAddress: row.mailing_address, otherAddress: row.other_address,
        isPrimary: row.is_primary, doNotCall: row.do_not_call,
        doNotEmail: row.do_not_email, description: row.description,
        tags: row.tags, customFields: row.custom_fields,
        ownerId: row.owner_id, status: row.status,
        individualFirstName: row.individuals?.first_name,
        individualLastName: row.individuals?.last_name,
        individualAvatarUrl: row.individuals?.avatar_url,
        individualEmail: row.individuals?.email,
        accountName: row.accounts?.name,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapActivity(row: any): CrmActivity {
    return {
        id: row.id, tenantId: row.tenant_id,
        activityType: row.activity_type, subject: row.subject,
        description: row.description, relatedToType: row.related_to_type,
        relatedToId: row.related_to_id, dueDate: row.due_date,
        startTime: row.start_time, endTime: row.end_time,
        completedAt: row.completed_at, isCompleted: row.is_completed,
        priority: row.priority, status: row.status, outcome: row.outcome,
        ownerId: row.owner_id, assignedTo: row.assigned_to,
        tags: row.tags, customFields: row.custom_fields,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapNote(row: any): CrmNote {
    return {
        id: row.id, tenantId: row.tenant_id,
        body: row.body, title: row.title,
        relatedToType: row.related_to_type, relatedToId: row.related_to_id,
        isPinned: row.is_pinned, ownerId: row.owner_id,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapDeal(row: any): Deal {
    const contact = row.contacts;
    const contactName = contact?.individuals
        ? `${contact.individuals.first_name} ${contact.individuals.last_name}`
        : null;
    return {
        id: row.id, tenantId: row.tenant_id,
        name: row.name, description: row.description,
        amount: row.amount, currency: row.currency,
        stage: row.stage, probability: row.probability,
        closeDate: row.close_date, accountId: row.account_id,
        contactId: row.contact_id, type: row.type,
        leadSource: row.lead_source, nextStep: row.next_step,
        lossReason: row.loss_reason, ownerId: row.owner_id,
        status: row.status, tags: row.tags, customFields: row.custom_fields,
        accountName: row.accounts?.name,
        contactName,
        expectedRevenue: row.amount && row.probability ? (row.amount * (row.probability / 100)) : 0,
        quotes: row.quotes?.map(mapQuote) || [],
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapCampaign(row: any): Campaign {
    return {
        id: row.id, tenantId: row.tenant_id,
        name: row.name, type: row.type, status: row.status,
        startDate: row.start_date, endDate: row.end_date,
        budget: row.budget, actualCost: row.actual_cost,
        expectedRevenue: row.expected_revenue,
        description: row.description,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapCampaignMember(row: any): CampaignMember {
    const ind = row.individuals;
    return {
        id: row.id, campaignId: row.campaign_id,
        individualId: row.individual_id, status: row.status,
        individualName: ind ? `${ind.first_name} ${ind.last_name}` : null,
        individualEmail: ind?.email,
        createdAt: row.created_at,
    };
}

function mapCase(row: any): SupportCase {
    const contact = row.contacts;
    const contactName = contact?.individuals
        ? `${contact.individuals.first_name} ${contact.individuals.last_name}`
        : null;
    return {
        id: row.id, tenantId: row.tenant_id,
        caseNumber: row.case_number, subject: row.subject,
        description: row.description, status: row.status,
        priority: row.priority, origin: row.origin, type: row.type,
        contactId: row.contact_id, accountId: row.account_id,
        resolution: row.resolution, closedAt: row.closed_at,
        contactName, accountName: row.accounts?.name,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapProduct(row: any): Product {
    return {
        id: row.id, tenantId: row.tenant_id,
        name: row.name, code: row.code, description: row.description,
        unitPrice: row.unit_price, currency: row.currency,
        category: row.category, isActive: row.is_active,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapQuote(row: any): Quote {
    const contact = row.contacts;
    const contactName = contact?.individuals
        ? `${contact.individuals.first_name} ${contact.individuals.last_name}`
        : null;
    return {
        id: row.id, tenantId: row.tenant_id,
        quoteNumber: row.quote_number, name: row.name,
        dealId: row.deal_id, accountId: row.account_id,
        contactId: row.contact_id, status: row.status,
        subtotal: row.subtotal, discountPercent: row.discount_percent,
        taxPercent: row.tax_percent, total: row.total,
        validUntil: row.valid_until, description: row.description,
        terms: row.terms, dealName: row.deals?.name,
        accountName: row.accounts?.name, contactName,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapQuoteItem(row: any): QuoteItem {
    return {
        id: row.id, quoteId: row.quote_id,
        productId: row.product_id, productName: row.product_name,
        quantity: row.quantity, unitPrice: row.unit_price,
        discountPercent: row.discount_percent, total: row.total,
        createdAt: row.created_at,
    };
}

// ─── Resolver ───────────────────────────────────────────

@Resolver()
export class CrmResolver {
    constructor(private crmService: CrmService) { }

    // ── Individuals ──

    @Query(() => [Individual])
    async individuals(
        @Args('tenantId') tenantId: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('leadStatus', { nullable: true }) leadStatus?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        const rows = await this.crmService.getIndividuals(tenantId, { status, leadStatus, search });
        return rows.map(mapIndividual);
    }

    @Query(() => Individual)
    async individual(@Args('id') id: string) {
        return mapIndividual(await this.crmService.getIndividual(id));
    }

    @Mutation(() => Individual)
    async createIndividual(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreateIndividualInput,
    ) {
        return mapIndividual(await this.crmService.createIndividual(tenantId, input));
    }

    @Mutation(() => Individual)
    async updateIndividual(
        @Args('id') id: string,
        @Args('input') input: UpdateIndividualInput,
    ) {
        return mapIndividual(await this.crmService.updateIndividual(id, input));
    }

    @Mutation(() => Boolean)
    async deleteIndividual(@Args('id') id: string) {
        return this.crmService.deleteIndividual(id);
    }

    // ── Accounts ──

    @Query(() => [Account])
    async accounts(
        @Args('tenantId') tenantId: string,
        @Args('type', { nullable: true }) type?: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        const rows = await this.crmService.getAccounts(tenantId, { type, status, search });
        return rows.map(mapAccount);
    }

    @Query(() => Account)
    async account(@Args('id') id: string) {
        return mapAccount(await this.crmService.getAccount(id));
    }

    @Mutation(() => Account)
    async createAccount(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreateAccountInput,
    ) {
        return mapAccount(await this.crmService.createAccount(tenantId, input));
    }

    @Mutation(() => Account)
    async updateAccount(
        @Args('id') id: string,
        @Args('input') input: UpdateAccountInput,
    ) {
        return mapAccount(await this.crmService.updateAccount(id, input));
    }

    @Mutation(() => Boolean)
    async deleteAccount(@Args('id') id: string) {
        return this.crmService.deleteAccount(id);
    }

    // ── Contacts ──

    @Query(() => [Contact])
    async contacts(
        @Args('tenantId') tenantId: string,
        @Args('accountId', { nullable: true }) accountId?: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        const rows = await this.crmService.getContacts(tenantId, { accountId, status, search });
        return rows.map(mapContact);
    }

    @Query(() => Contact)
    async contact(@Args('id') id: string) {
        return mapContact(await this.crmService.getContact(id));
    }

    @Query(() => [Contact])
    async contactsByIndividual(@Args('individualId') individualId: string) {
        const rows = await this.crmService.getContactsByIndividual(individualId);
        return rows.map(mapContact);
    }

    @Query(() => [Contact])
    async contactsByAccount(@Args('accountId') accountId: string) {
        const rows = await this.crmService.getContactsByAccount(accountId);
        return rows.map(mapContact);
    }

    @Mutation(() => Contact)
    async createContact(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreateContactInput,
    ) {
        return mapContact(await this.crmService.createContact(tenantId, input));
    }

    @Mutation(() => Contact)
    async updateContact(
        @Args('id') id: string,
        @Args('input') input: UpdateContactInput,
    ) {
        return mapContact(await this.crmService.updateContact(id, input));
    }

    @Mutation(() => Boolean)
    async deleteContact(@Args('id') id: string) {
        return this.crmService.deleteContact(id);
    }

    // ── Activities ──

    @Query(() => [CrmActivity])
    async crmActivities(
        @Args('tenantId') tenantId: string,
        @Args('relatedToType', { nullable: true }) relatedToType?: string,
        @Args('relatedToId', { nullable: true }) relatedToId?: string,
        @Args('activityType', { nullable: true }) activityType?: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        const rows = await this.crmService.getActivities(tenantId, { relatedToType, relatedToId, activityType, status, search });
        return rows.map(mapActivity);
    }

    @Mutation(() => CrmActivity)
    async createCrmActivity(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreateActivityInput,
    ) {
        return mapActivity(await this.crmService.createActivity(tenantId, input));
    }

    @Mutation(() => CrmActivity)
    async updateCrmActivity(
        @Args('id') id: string,
        @Args('input') input: UpdateActivityInput,
    ) {
        return mapActivity(await this.crmService.updateActivity(id, input));
    }

    @Mutation(() => CrmActivity)
    async completeCrmActivity(@Args('id') id: string) {
        return mapActivity(await this.crmService.completeActivity(id));
    }

    @Mutation(() => Boolean)
    async deleteCrmActivity(@Args('id') id: string) {
        return this.crmService.deleteActivity(id);
    }

    // ── Notes ──

    @Query(() => [CrmNote])
    async crmNotes(
        @Args('tenantId') tenantId: string,
        @Args('relatedToType', { nullable: true }) relatedToType?: string,
        @Args('relatedToId', { nullable: true }) relatedToId?: string,
    ) {
        const rows = await this.crmService.getNotes(tenantId, { relatedToType, relatedToId });
        return rows.map(mapNote);
    }

    @Mutation(() => CrmNote)
    async createCrmNote(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreateNoteInput,
    ) {
        return mapNote(await this.crmService.createNote(tenantId, input));
    }

    @Mutation(() => CrmNote)
    async updateCrmNote(
        @Args('id') id: string,
        @Args('input') input: UpdateNoteInput,
    ) {
        return mapNote(await this.crmService.updateNote(id, input));
    }

    @Mutation(() => Boolean)
    async deleteCrmNote(@Args('id') id: string) {
        return this.crmService.deleteNote(id);
    }

    // ── Deals ──

    @Query(() => [Deal])
    async deals(
        @Args('tenantId') tenantId: string,
        @Args('stage', { nullable: true }) stage?: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('accountId', { nullable: true }) accountId?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        const rows = await this.crmService.getDeals(tenantId, { stage, status, accountId, search });
        return rows.map(mapDeal);
    }

    @Query(() => Deal)
    async deal(@Args('id') id: string) {
        return mapDeal(await this.crmService.getDeal(id));
    }

    @Mutation(() => Deal)
    async createDeal(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreateDealInput,
    ) {
        return mapDeal(await this.crmService.createDeal(tenantId, input));
    }

    @Mutation(() => Deal)
    async updateDeal(
        @Args('id') id: string,
        @Args('input') input: UpdateDealInput,
    ) {
        return mapDeal(await this.crmService.updateDeal(id, input));
    }

    @Mutation(() => Boolean)
    async deleteDeal(@Args('id') id: string) {
        return this.crmService.deleteDeal(id);
    }

    // ── Lead Conversion ──

    @Mutation(() => ConvertLeadResult)
    async convertLead(
        @Args('tenantId') tenantId: string,
        @Args('input') input: ConvertLeadInput,
    ) {
        return this.crmService.convertLead(tenantId, input);
    }

    // ── Campaigns ──

    @Query(() => [Campaign])
    async campaigns(
        @Args('tenantId') tenantId: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        const rows = await this.crmService.getCampaigns(tenantId, { status, search });
        return rows.map(mapCampaign);
    }

    @Mutation(() => Campaign)
    async createCampaign(@Args('tenantId') tenantId: string, @Args('input') input: CreateCampaignInput) {
        return mapCampaign(await this.crmService.createCampaign(tenantId, input));
    }

    @Mutation(() => Campaign)
    async updateCampaign(@Args('id') id: string, @Args('input') input: UpdateCampaignInput) {
        return mapCampaign(await this.crmService.updateCampaign(id, input));
    }

    @Mutation(() => Boolean)
    async deleteCampaign(@Args('id') id: string) {
        return this.crmService.deleteCampaign(id);
    }

    @Query(() => [CampaignMember])
    async campaignMembers(@Args('campaignId') campaignId: string) {
        const rows = await this.crmService.getCampaignMembers(campaignId);
        return rows.map(mapCampaignMember);
    }

    @Mutation(() => CampaignMember)
    async addCampaignMember(
        @Args('campaignId') campaignId: string,
        @Args('individualId') individualId: string,
        @Args('status', { nullable: true }) status?: string,
    ) {
        return mapCampaignMember(await this.crmService.addCampaignMember(campaignId, individualId, status));
    }

    @Mutation(() => Boolean)
    async removeCampaignMember(@Args('id') id: string) {
        return this.crmService.removeCampaignMember(id);
    }

    // ── Cases ──

    @Query(() => [SupportCase])
    async cases(
        @Args('tenantId') tenantId: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('priority', { nullable: true }) priority?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        const rows = await this.crmService.getCases(tenantId, { status, priority, search });
        return rows.map(mapCase);
    }

    @Mutation(() => SupportCase)
    async createCase(@Args('tenantId') tenantId: string, @Args('input') input: CreateCaseInput) {
        return mapCase(await this.crmService.createCase(tenantId, input));
    }

    @Mutation(() => SupportCase)
    async updateCase(@Args('id') id: string, @Args('input') input: UpdateCaseInput) {
        return mapCase(await this.crmService.updateCase(id, input));
    }

    @Mutation(() => SupportCase)
    async closeCase(@Args('id') id: string, @Args('resolution') resolution: string) {
        return mapCase(await this.crmService.closeCase(id, resolution));
    }

    @Mutation(() => Boolean)
    async deleteCase(@Args('id') id: string) {
        return this.crmService.deleteCase(id);
    }

    // ── Products ──

    @Query(() => [Product])
    async products(
        @Args('tenantId') tenantId: string,
        @Args('search', { nullable: true }) search?: string,
        @Args('category', { nullable: true }) category?: string,
    ) {
        const rows = await this.crmService.getProducts(tenantId, { search, category });
        return rows.map(mapProduct);
    }

    @Mutation(() => Product)
    async createProduct(@Args('tenantId') tenantId: string, @Args('input') input: CreateProductInput) {
        return mapProduct(await this.crmService.createProduct(tenantId, input));
    }

    @Mutation(() => Product)
    async updateProduct(@Args('id') id: string, @Args('input') input: UpdateProductInput) {
        return mapProduct(await this.crmService.updateProduct(id, input));
    }

    @Mutation(() => Boolean)
    async deleteProduct(@Args('id') id: string) {
        return this.crmService.deleteProduct(id);
    }

    // ── Quotes ──

    @Query(() => [Quote])
    async quotes(
        @Args('tenantId') tenantId: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('dealId', { nullable: true }) dealId?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        const rows = await this.crmService.getQuotes(tenantId, { status, dealId, search });
        return rows.map(mapQuote);
    }

    @Mutation(() => Quote)
    async createQuote(@Args('tenantId') tenantId: string, @Args('input') input: CreateQuoteInput) {
        return mapQuote(await this.crmService.createQuote(tenantId, input));
    }

    @Mutation(() => Quote)
    async updateQuote(@Args('id') id: string, @Args('input') input: UpdateQuoteInput) {
        return mapQuote(await this.crmService.updateQuote(id, input));
    }

    @Query(() => [QuoteItem])
    async quoteItems(@Args('quoteId') quoteId: string) {
        const rows = await this.crmService.getQuoteItems(quoteId);
        return rows.map(mapQuoteItem);
    }

    @Mutation(() => Boolean)
    async deleteQuote(@Args('id') id: string) {
        return this.crmService.deleteQuote(id);
    }

    // ── Dashboard ──

    @Query(() => CrmDashboardStats)
    async crmDashboard(@Args('tenantId') tenantId: string) {
        return this.crmService.getDashboardStats(tenantId);
    }

    // ── AI Intelligence ──

    @Query(() => [LeadScore])
    async leadScores(@Args('tenantId') tenantId: string) {
        return this.crmService.scoreLeads(tenantId);
    }

    @Query(() => [DealInsight])
    async dealInsights(@Args('tenantId') tenantId: string) {
        return this.crmService.getDealInsights(tenantId);
    }

    @Query(() => String)
    async generateCampaignContent(@Args('campaignId') campaignId: string) {
        return this.crmService.generateCampaignContent(campaignId);
    }

    @Query(() => String)
    async generateDealNextBestAction(@Args('dealId') dealId: string) {
        return this.crmService.generateDealNextBestAction(dealId);
    }
}
