import { UnauthorizedException } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { resolveAosTenant, type AosSessionUser } from '../agentic-os/aos-tenant-access';
import { StudioWebCrawlerService } from './studio-web-crawler.service';
import { StudioWebCrawlJob, StudioWebCrawlJobInput } from './studio-web-crawler.types';

type Ctx = {
    req?: { user?: { id?: string; email?: string; role?: string; tenantId?: string | null } | null };
};

const optStr = { type: () => String, nullable: true } as const;

const tenantForRead = (ctx: Ctx, tenantId?: string | null): string => {
    const user = ctx?.req?.user;
    if (!user?.id) throw new UnauthorizedException('Authentication required for this operation');
    return resolveAosTenant(user as AosSessionUser, tenantId);
};

@Resolver()
export class StudioWebCrawlerResolver {
    constructor(private readonly svc: StudioWebCrawlerService) {}

    @Query(() => [StudioWebCrawlJob], { name: 'studioWebCrawlJobs' })
    studioWebCrawlJobs(@Context() ctx: Ctx, @Args('tenantId', optStr) tenantId?: string) {
        return this.svc.listJobs(tenantForRead(ctx, tenantId));
    }

    @Mutation(() => StudioWebCrawlJob, { name: 'createStudioWebCrawlJob' })
    createStudioWebCrawlJob(
        @Context() ctx: Ctx,
        @Args('input') input: StudioWebCrawlJobInput,
        @Args('tenantId', optStr) tenantId?: string,
    ) {
        const t = tenantForRead(ctx, tenantId);
        return this.svc.createJob(t, input.name, input.config, ctx.req?.user?.id ?? null);
    }

    @Mutation(() => Boolean, { name: 'deleteStudioWebCrawlJob' })
    deleteStudioWebCrawlJob(
        @Context() ctx: Ctx,
        @Args('id') id: string,
        @Args('tenantId', optStr) tenantId?: string,
    ) {
        const t = tenantForRead(ctx, tenantId);
        return this.svc.deleteJob(t, id);
    }

    @Mutation(() => StudioWebCrawlJob, { name: 'stopStudioWebCrawlJob' })
    stopStudioWebCrawlJob(
        @Context() ctx: Ctx,
        @Args('id') id: string,
        @Args('tenantId', optStr) tenantId?: string,
    ) {
        const t = tenantForRead(ctx, tenantId);
        return this.svc.stopJob(t, id);
    }
}
