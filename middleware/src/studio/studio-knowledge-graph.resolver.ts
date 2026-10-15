import { UnauthorizedException } from '@nestjs/common';
import { Args, Context, Int, Query, Resolver } from '@nestjs/graphql';
import { resolveAosTenant, type AosSessionUser } from '../agentic-os/aos-tenant-access';
import { StudioKnowledgeGraphService } from './studio-knowledge-graph.service';
import {
    StudioKnowledgeGraphChunkDetail,
    StudioKnowledgeGraphOverview,
    StudioKnowledgeGraphSearchHit,
} from './studio-knowledge-graph.types';

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
export class StudioKnowledgeGraphResolver {
    constructor(private readonly svc: StudioKnowledgeGraphService) {}

    @Query(() => StudioKnowledgeGraphOverview, { name: 'studioKnowledgeGraphOverview' })
    studioKnowledgeGraphOverview(
        @Context() ctx: Ctx,
        @Args('tenantId', optStr) tenantId?: string,
        @Args('maxChunksPerSource', { type: () => Int, nullable: true }) maxChunksPerSource?: number,
    ) {
        const t = tenantForRead(ctx, tenantId);
        return this.svc.getOverview(t, maxChunksPerSource ?? 40);
    }

    @Query(() => [StudioKnowledgeGraphSearchHit], { name: 'studioKnowledgeGraphSearch' })
    studioKnowledgeGraphSearch(
        @Context() ctx: Ctx,
        @Args('query') query: string,
        @Args('tenantId', optStr) tenantId?: string,
        @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    ) {
        const t = tenantForRead(ctx, tenantId);
        return this.svc.search(t, query, limit ?? 16);
    }

    @Query(() => StudioKnowledgeGraphChunkDetail, { name: 'studioKnowledgeGraphChunk' })
    studioKnowledgeGraphChunk(
        @Context() ctx: Ctx,
        @Args('chunkId') chunkId: string,
        @Args('tenantId', optStr) tenantId?: string,
    ) {
        const t = tenantForRead(ctx, tenantId);
        return this.svc.getChunkDetail(t, chunkId);
    }
}
