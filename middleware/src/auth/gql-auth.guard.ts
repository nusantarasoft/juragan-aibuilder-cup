import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthService } from './auth.service';

/* v8 ignore start */
@Injectable()
export class GqlAuthGuard implements CanActivate {
/* v8 ignore stop */
    constructor(private readonly authService: AuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const ctx = GqlExecutionContext.create(context);
        const gqlCtx = ctx.getContext<{ req?: { headers?: { authorization?: string }; user?: unknown } }>();
        const req = gqlCtx?.req;
        const authHeader = req && req.headers ? req.headers.authorization : undefined;

        if (!authHeader) {
            throw new UnauthorizedException('Authentication required for this operation');
        }

        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        if (!token) {
            throw new UnauthorizedException('Authentication required for this operation');
        }

        try {
            const user = await this.authService.getUser(token);
            req!.user = {
                id: user.id,
                email: user.email,
                role: user.role,
            };
            return true;
        } catch (err) {
            if (err instanceof Error) {
                throw new UnauthorizedException(err.message);
            }
            throw new UnauthorizedException('Invalid session');
        }
    }
}
