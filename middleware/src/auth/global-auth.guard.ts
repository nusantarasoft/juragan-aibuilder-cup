import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { IS_ALTERNATIVE_AUTH_KEY } from './alternative-auth.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';

type AuthedRequest = {
    headers?: { authorization?: string };
    user?: {
        id: string;
        email?: string;
        role?: string;
        tenantId?: string | null;
        studioSlug?: string | null;
        emailVerified?: boolean;
    } | null;
};

@Injectable()
export class GlobalAuthGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly authService: AuthService,
    ) {}

    private isBypass(context: ExecutionContext): boolean {
        return (
            this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
                context.getHandler(),
                context.getClass(),
            ]) ||
            this.reflector.getAllAndOverride<boolean>(IS_ALTERNATIVE_AUTH_KEY, [
                context.getHandler(),
                context.getClass(),
            ])
        );
    }

    private getRequest(context: ExecutionContext): AuthedRequest | undefined {
        if (context.getType<'graphql'>() === 'graphql') {
            return GqlExecutionContext.create(context).getContext<{ req?: AuthedRequest }>()?.req;
        }
        return context.switchToHttp().getRequest<AuthedRequest>();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        if (this.isBypass(context)) {
            return true;
        }

        const req = this.getRequest(context);
        const authHeader = req?.headers?.authorization;

        if (!authHeader) {
            throw new UnauthorizedException('Authentication required for this operation');
        }

        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        if (!token) {
            throw new UnauthorizedException('Authentication required for this operation');
        }

        try {
            const user = await this.authService.getUser(token);
            if (req) {
                req.user = {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    tenantId: (user as { tenantId?: string | null }).tenantId ?? null,
                    studioSlug: (user as { studioSlug?: string | null }).studioSlug ?? null,
                    emailVerified: Boolean((user as { emailVerified?: boolean }).emailVerified),
                };
            }
            return true;
        } catch (err) {
            if (err instanceof Error) {
                throw new UnauthorizedException(err.message);
            }
            throw new UnauthorizedException('Invalid session');
        }
    }
}
