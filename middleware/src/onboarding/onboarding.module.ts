import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { StudioModule } from '../studio/studio.module';
import { CaptchaService } from './captcha.service';
import { OnboardingResolver } from './onboarding.resolver';
import { OnboardingService } from './onboarding.service';
import { TenantMembershipService } from './tenant-membership.service';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { WaWhitelistService } from './wa-whitelist.service';

@Module({
    imports: [SupabaseModule, AuthModule, forwardRef(() => StudioModule)],
    providers: [
        CaptchaService,
        OnboardingService,
        OnboardingResolver,
        TenantMembershipService,
        TenantProvisioningService,
        WaWhitelistService,
    ],
    exports: [TenantMembershipService, TenantProvisioningService, WaWhitelistService, OnboardingService],
})
export class OnboardingModule {}
