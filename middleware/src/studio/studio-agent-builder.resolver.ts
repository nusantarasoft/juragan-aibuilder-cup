import { UnauthorizedException } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { resolveAosTenant, type AosSessionUser } from '../agentic-os/aos-tenant-access';
import { StudioAgentBuilderService } from './studio-agent-builder.service';
import {
    StudioAgentWorkflow,
    StudioAgentWorkflowInput,
    StudioAgentWorkflowUpdateInput,
} from './studio-agent-builder.types';

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
export class StudioAgentBuilderResolver {
    constructor(private readonly svc: StudioAgentBuilderService) {}

    @Query(() => [StudioAgentWorkflow], { name: 'studioAgentWorkflows' })
    studioAgentWorkflows(@Context() ctx: Ctx, @Args('tenantId', optStr) tenantId?: string) {
        return this.svc.listWorkflows(tenantForRead(ctx, tenantId));
    }

    @Mutation(() => StudioAgentWorkflow, { name: 'createStudioAgentWorkflow' })
    createStudioAgentWorkflow(
        @Context() ctx: Ctx,
        @Args('input') input: StudioAgentWorkflowInput,
        @Args('tenantId', optStr) tenantId?: string,
    ) {
        const t = tenantForRead(ctx, tenantId);
        return this.svc.createWorkflow(
            t,
            {
                name: input.name,
                description: input.description,
                status: input.status,
                graph: input.graph,
                aosPlaybookId: input.aosPlaybookId,
            },
            ctx.req?.user?.id ?? null,
        );
    }

    @Mutation(() => StudioAgentWorkflow, { name: 'updateStudioAgentWorkflow' })
    updateStudioAgentWorkflow(
        @Context() ctx: Ctx,
        @Args('id') id: string,
        @Args('input') input: StudioAgentWorkflowUpdateInput,
        @Args('tenantId', optStr) tenantId?: string,
    ) {
        const t = tenantForRead(ctx, tenantId);
        return this.svc.updateWorkflow(t, id, {
            name: input.name,
            description: input.description,
            status: input.status,
            graph: input.graph,
            aosPlaybookId: input.aosPlaybookId,
        });
    }

    @Mutation(() => Boolean, { name: 'deleteStudioAgentWorkflow' })
    deleteStudioAgentWorkflow(
        @Context() ctx: Ctx,
        @Args('id') id: string,
        @Args('tenantId', optStr) tenantId?: string,
    ) {
        const t = tenantForRead(ctx, tenantId);
        return this.svc.deleteWorkflow(t, id);
    }

    @Mutation(() => StudioAgentWorkflow, { name: 'recordStudioAgentWorkflowTestRun' })
    recordStudioAgentWorkflowTestRun(
        @Context() ctx: Ctx,
        @Args('id') id: string,
        @Args('tenantId', optStr) tenantId?: string,
    ) {
        const t = tenantForRead(ctx, tenantId);
        return this.svc.recordTestRun(t, id);
    }
}
