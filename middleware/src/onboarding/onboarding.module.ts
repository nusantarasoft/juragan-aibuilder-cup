import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { StudioModule } from '../studio/studio.module';
import { WhatsAppProviderModule } from '../whatsapp/whatsapp-provider.module';
import { CaptchaService } from './captcha.service';
import { OnboardingResolver } from './onboarding.resolver';
import { OnboardingService } from './onboarding.service';
import { TenantMembershipService } from './tenant-membership.service';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { WaWhitelistService } from './wa-whitelist.service';
import { WaOtpService } from './wa-otp.service';
import { WaConnectionService } from './wa-connection.service';
import { WaDedicatedService } from './wa-dedicated.service';
import { WaOtpOutboundService } from './wa-otp-outbound.service';

@Module({
    imports: [SupabaseModule, AuthModule, WhatsAppProviderModule, forwardRef(() => StudioModule)],
    providers: [
        CaptchaService,
        OnboardingService,
        OnboardingResolver,
        TenantMembershipService,
        TenantProvisioningService,
        WaWhitelistService,
        WaOtpService,
        WaOtpOutboundService,
        WaConnectionService,
        WaDedicatedService,
    ],
    exports: [
        TenantMembershipService,
        TenantProvisioningService,
        WaWhitelistService,
        WaConnectionService,
        WaDedicatedService,
        OnboardingService,
    ],
})
export class OnboardingModule {}
