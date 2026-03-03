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
        avatarUrl: row.avatar_url, status: row.status,
        customFields: row.custom_fields,
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
}
