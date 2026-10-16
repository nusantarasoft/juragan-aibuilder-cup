import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ROLES_KEY } from './roles.decorator';
import { hasMinRole, type AppRole } from './app-roles';

/* v8 ignore start */
@Injectable()
export class RolesGuard implements CanActivate {
/* v8 ignore stop */
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        let user: { role?: string } | undefined;
        if (context.getType() === 'http') {
            user = context.switchToHttp().getRequest<{ user?: { role?: string } }>()?.user;
        } else {
            const ctx = GqlExecutionContext.create(context);
            const gqlCtx = ctx.getContext<{ req?: { user?: { role?: string } } }>();
            user = gqlCtx?.req ? gqlCtx.req.user : undefined;
        }

        if (!user || !user.role) {
            throw new UnauthorizedException('Authentication required for this operation');
        }

        if (!hasMinRole(user.role, requiredRoles)) {
            throw new UnauthorizedException('You do not have the required permissions');
        }

        return true;
    }
}
