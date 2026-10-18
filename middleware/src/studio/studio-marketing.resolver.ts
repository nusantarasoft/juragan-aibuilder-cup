import { UnauthorizedException } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphQLJSONObject } from 'graphql-type-json';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { StudioMarketingService } from './studio-marketing.service';

type Ctx = {
    req?: { user?: { id?: string; role?: string } | null };
};

const sessionUser = (ctx: Ctx) => {
    const user = ctx?.req?.user;
    if (!user?.id) throw new UnauthorizedException('Authentication required');
    return user;
};

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
@Roles('super_admin')
export class StudioMarketingResolver {
    constructor(private readonly svc: StudioMarketingService) {}

    @Query(() => [GraphQLJSONObject], { name: 'studioMarketingContents' })
    async studioMarketingContents(
        @Context() ctx: Ctx,
        @Args('status', { nullable: true }) status?: string,
        @Args('tenantId', { nullable: true }) tenantId?: string,
    ) {
        this.svc.assertSuperAdmin(sessionUser(ctx).role);
        return this.svc.listContents((status as any) || 'pending', tenantId);
    }

    @Query(() => GraphQLJSONObject, { name: 'studioMarketingContent' })
    async studioMarketingContent(@Context() ctx: Ctx, @Args('id') id: string) {
        this.svc.assertSuperAdmin(sessionUser(ctx).role);
        return this.svc.getById(id);
    }

    @Query(() => [GraphQLJSONObject], { name: 'studioMarketingStores' })
    async studioMarketingStores(@Context() ctx: Ctx) {
        this.svc.assertSuperAdmin(sessionUser(ctx).role);
        return this.svc.listStoresWithConsent();
    }

    @Mutation(() => GraphQLJSONObject, { name: 'studioMarketingUpdateCaption' })
    async studioMarketingUpdateCaption(
        @Context() ctx: Ctx,
        @Args('id') id: string,
        @Args('caption') caption: string,
        @Args('headline', { nullable: true }) headline?: string,
    ) {
        this.svc.assertSuperAdmin(sessionUser(ctx).role);
        return this.svc.updateCaption(id, caption, headline);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'studioMarketingApprove' })
    async studioMarketingApprove(@Context() ctx: Ctx, @Args('id') id: string) {
        const user = sessionUser(ctx);
        this.svc.assertSuperAdmin(user.role);
        return this.svc.approve(id, user.id!);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'studioMarketingReject' })
    async studioMarketingReject(
        @Context() ctx: Ctx,
        @Args('id') id: string,
        @Args('reason', { nullable: true }) reason?: string,
    ) {
        const user = sessionUser(ctx);
        this.svc.assertSuperAdmin(user.role);
        return this.svc.reject(id, user.id!, reason);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'studioMarketingUnpublish' })
    async studioMarketingUnpublish(@Context() ctx: Ctx, @Args('id') id: string) {
        const user = sessionUser(ctx);
        this.svc.assertSuperAdmin(user.role);
        return this.svc.unpublish(id, user.id!);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'studioMarketingSetStoreConsent' })
    async studioMarketingSetStoreConsent(
        @Context() ctx: Ctx,
        @Args('tenantId') tenantId: string,
        @Args('consent') consent: boolean,
    ) {
        const user = sessionUser(ctx);
        this.svc.assertSuperAdmin(user.role);
        return this.svc.setStoreConsent(tenantId, consent, user.id!);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'studioMarketingGenerate' })
    async studioMarketingGenerate(
        @Context() ctx: Ctx,
        @Args('store', { nullable: true }) store?: string,
        @Args('productId', { nullable: true }) productId?: string,
        @Args('limit', { nullable: true }) limit?: number,
    ) {
        const user = sessionUser(ctx);
        this.svc.assertSuperAdmin(user.role);
        return this.svc.generateNow({
            store,
            productId,
            limit,
            triggeredBy: user.id!,
        });
    }
}
