import { UnauthorizedException } from '@nestjs/common';
import { Args, Context, Query, Resolver } from '@nestjs/graphql';
import { resolveAosTenant, type AosSessionUser } from '../agentic-os/aos-tenant-access';
import { StudioLabelStudioService } from './studio-label-studio.service';
import { StudioLabelStudioDashboard } from './studio-label-studio.types';

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
export class StudioLabelStudioResolver {
    constructor(private readonly svc: StudioLabelStudioService) {}

    @Query(() => StudioLabelStudioDashboard, { name: 'studioLabelStudioDashboard' })
    studioLabelStudioDashboard(@Context() ctx: Ctx, @Args('tenantId', optStr) tenantId?: string) {
        const t = tenantForRead(ctx, tenantId);
        return this.svc.getDashboard(t);
    }
}
