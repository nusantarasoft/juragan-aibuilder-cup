import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CaptchaService } from './captcha.service';
import { checkOnboardingRateLimit } from './onboarding-rate-limit';
import { TenantProvisioningService } from './tenant-provisioning.service';

export type RegisterTenantInput = {
    email: string;
    password: string;
    storeName: string;
    ownerName?: string | null;
    captchaToken: string;
    clientIp?: string | null;
};

@Injectable()
export class OnboardingService {
    constructor(
        private readonly auth: AuthService,
        private readonly supabase: SupabaseService,
        private readonly captcha: CaptchaService,
        private readonly provisioning: TenantProvisioningService,
        private readonly config: ConfigService,
    ) {}

    async registerTenant(input: RegisterTenantInput) {
        const email = input.email.trim().toLowerCase();
        if (!email.includes('@')) throw new BadRequestException('Invalid email');
        if ((input.password || '').length < 8) {
            throw new BadRequestException('Password must be at least 8 characters');
        }

        await this.captcha.verifyAsync(input.captchaToken);

        const ipKey = input.clientIp?.trim() || 'unknown';
        const max = Number(this.config.get('ONBOARDING_RATE_LIMIT_MAX') ?? 5);
        const windowMs = Number(this.config.get('ONBOARDING_RATE_LIMIT_WINDOW_MS') ?? 3600_000);
        const emailMax = Number(this.config.get('ONBOARDING_RATE_LIMIT_EMAIL_MAX') ?? 3);
        if (!checkOnboardingRateLimit(`register:ip:${ipKey}`, max, windowMs)) {
            throw new BadRequestException('Too many signup attempts; try again later');
        }
        if (!checkOnboardingRateLimit(`register:email:${email}`, emailMax, windowMs)) {
            throw new BadRequestException('Too many signup attempts for this email; try again later');
        }

        const signUp = await this.auth.signUp(email, input.password, {
            name: input.ownerName ?? input.storeName,
        });
        const user = signUp.user;
        if (!user?.id) {
            throw new BadRequestException('Signup failed');
        }

        const provision = await this.provisioning.provisionStore({
            source: 'web',
            storeDisplayName: input.storeName,
            ownerUserId: user.id,
            ownerEmail: email,
            ownerName: input.ownerName ?? input.storeName,
        });

        const emailConfirmed = Boolean((user as { email_confirmed_at?: string | null }).email_confirmed_at);
        let accessToken: string | undefined;
        let refreshToken: string | undefined;
        if (emailConfirmed && signUp.session) {
            accessToken = (signUp.session as { access_token?: string }).access_token;
            refreshToken = (signUp.session as { refresh_token?: string }).refresh_token;
        }

        return {
            tenantId: provision.tenantId,
            studioSlug: provision.studioSlug,
            storeId: provision.storeId,
            userId: user.id,
            email,
            emailVerified: emailConfirmed,
            accessToken,
            refreshToken,
            message: emailConfirmed
                ? 'Registration complete'
                : 'Check your email to verify your account before signing in',
        };
    }

    async mintCaptchaTokenForTests(): Promise<string> {
        return this.captcha.mintDevToken();
    }

    async resolveUuidFromStudioSlug(slug: string): Promise<string | null> {
        const { data } = await this.supabase
            .getAdminClient()
            .from('tenant_slug_aliases')
            .select('tenant_id')
            .eq('slug', slug)
            .maybeSingle();
        return (data?.tenant_id as string | undefined) ?? null;
    }
}
