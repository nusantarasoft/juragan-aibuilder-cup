import { UnauthorizedException } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphQLJSONObject } from 'graphql-type-json';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { StudioResearchService } from './studio-research.service';

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
export class StudioResearchResolver {
    constructor(private readonly svc: StudioResearchService) {}

    @Query(() => [GraphQLJSONObject], { name: 'studioResearchItems' })
    async studioResearchItems(
        @Context() ctx: Ctx,
        @Args('status', { nullable: true }) status?: string,
        @Args('category', { nullable: true }) category?: string,
    ) {
        this.svc.assertSuperAdmin(sessionUser(ctx).role);
        return this.svc.listItems((status as any) || 'pending', category);
    }

    @Query(() => GraphQLJSONObject, { name: 'studioResearchItem' })
    async studioResearchItem(@Context() ctx: Ctx, @Args('id') id: string) {
        this.svc.assertSuperAdmin(sessionUser(ctx).role);
        return this.svc.getById(id);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'studioResearchUpdateItem' })
    async studioResearchUpdateItem(
        @Context() ctx: Ctx,
        @Args('id') id: string,
        @Args('title', { nullable: true }) title?: string,
        @Args('summary', { nullable: true }) summary?: string,
    ) {
        const user = sessionUser(ctx);
        this.svc.assertSuperAdmin(user.role);
        return this.svc.updateItem(id, { title, summary }, user.id!);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'studioResearchApprove' })
    async studioResearchApprove(@Context() ctx: Ctx, @Args('id') id: string) {
        const user = sessionUser(ctx);
        this.svc.assertSuperAdmin(user.role);
        return this.svc.approveAndMerge(id, user.id!);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'studioResearchReject' })
    async studioResearchReject(
        @Context() ctx: Ctx,
        @Args('id') id: string,
        @Args('reason', { nullable: true }) reason?: string,
    ) {
        const user = sessionUser(ctx);
        this.svc.assertSuperAdmin(user.role);
        return this.svc.reject(id, user.id!, reason);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'studioResearchUnmerge' })
    async studioResearchUnmerge(@Context() ctx: Ctx, @Args('id') id: string) {
        const user = sessionUser(ctx);
        this.svc.assertSuperAdmin(user.role);
        return this.svc.unmerge(id, user.id!);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'studioResearchRunNow' })
    async studioResearchRunNow(@Context() ctx: Ctx) {
        const user = sessionUser(ctx);
        this.svc.assertSuperAdmin(user.role);
        return this.svc.runResearchNow(user.id!);
    }
}
