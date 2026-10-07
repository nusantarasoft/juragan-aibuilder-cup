import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthService } from '../auth/auth.service';

const SIGN_IN_MESSAGE = 'Sign in to change the Agentic OS';

type AosGqlContext = {
    req?: {
        headers?: { authorization?: string };
        user?: { id: string; email?: string; role?: string } | null;
    };
};

/**
 * Guards every Agentic OS mutation.
 * - A Bearer token is validated with AuthService.getUser and stored on req.user.
 * - No Authorization header: allowed only when AOS_ALLOW_ANONYMOUS === 'true'.
 * - An invalid token is always rejected.
 */
@Injectable()
export class AosAuthGuard implements CanActivate {
    constructor(private readonly authService: AuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const gqlCtx = GqlExecutionContext.create(context).getContext<AosGqlContext>();
        const req = gqlCtx?.req;
        const authHeader = req?.headers?.authorization;

        if (!authHeader) {
            if (process.env.AOS_ALLOW_ANONYMOUS === 'true') {
                if (req) req.user = null;
                return true;
            }
            throw new UnauthorizedException(SIGN_IN_MESSAGE);
        }

        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        if (!token) throw new UnauthorizedException(SIGN_IN_MESSAGE);

        try {
            const user = await this.authService.getUser(token);
            req!.user = { id: user.id, email: user.email, role: user.role };
            return true;
        } catch (err) {
            throw new UnauthorizedException(err instanceof Error ? err.message : 'Invalid session');
        }
    }
}
