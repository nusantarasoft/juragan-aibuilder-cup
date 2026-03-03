import { Resolver, Query, Mutation, Args, ObjectType, Field, ID, InputType } from '@nestjs/graphql';
import { TenantsService } from './tenants.service';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class Tenant {
    @Field(() => ID) id: string;
    @Field() name: string;
    @Field() slug: string;
    @Field({ nullable: true }) domain?: string;
    @Field({ nullable: true }) logoUrl?: string;
    @Field(() => GraphQLJSON, { nullable: true }) settings?: any;
    @Field({ nullable: true }) subscriptionPlan?: string;
    @Field() isActive: boolean;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@InputType()
export class CreateTenantInput {
    @Field() name: string;
    @Field() slug: string;
    @Field({ nullable: true }) domain?: string;
    @Field({ nullable: true }) logoUrl?: string;
    @Field({ nullable: true }) subscriptionPlan?: string;
}

@InputType()
export class UpdateTenantInput {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) slug?: string;
    @Field({ nullable: true }) domain?: string;
    @Field({ nullable: true }) logoUrl?: string;
    @Field(() => GraphQLJSON, { nullable: true }) settings?: any;
    @Field({ nullable: true }) subscriptionPlan?: string;
    @Field({ nullable: true }) isActive?: boolean;
}

function mapTenant(data: any): Tenant {
    return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        domain: data.domain,
        logoUrl: data.logo_url,
        settings: data.settings,
        subscriptionPlan: data.subscription_plan,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
}

@Resolver(() => Tenant)
export class TenantsResolver {
    constructor(private tenantsService: TenantsService) { }

    @Query(() => [Tenant])
    async tenants(): Promise<Tenant[]> {
        const data = await this.tenantsService.findAll();
        return data.map(mapTenant);
    }

    @Query(() => Tenant, { nullable: true })
    async tenant(@Args('id') id: string): Promise<Tenant | null> {
        const data = await this.tenantsService.findById(id);
        return data ? mapTenant(data) : null;
    }

    @Query(() => Tenant, { nullable: true })
    async tenantBySlug(@Args('slug') slug: string): Promise<Tenant | null> {
        const data = await this.tenantsService.findBySlug(slug);
        return data ? mapTenant(data) : null;
    }

    @Mutation(() => Tenant)
    async createTenant(@Args('input') input: CreateTenantInput): Promise<Tenant> {
        const data = await this.tenantsService.create(input);
        return mapTenant(data);
    }

    @Mutation(() => Tenant)
    async updateTenant(
        @Args('id') id: string,
        @Args('input') input: UpdateTenantInput,
    ): Promise<Tenant> {
        const data = await this.tenantsService.update(id, input);
        return mapTenant(data);
    }

    @Mutation(() => Boolean)
    async deleteTenant(@Args('id') id: string): Promise<boolean> {
        return this.tenantsService.delete(id);
    }
}
