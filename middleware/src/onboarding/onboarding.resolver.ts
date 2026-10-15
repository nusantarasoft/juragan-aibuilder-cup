import {
    Args,
    Context,
    Field,
    InputType,
    Mutation,
    ObjectType,
    Query,
    Resolver,
} from '@nestjs/graphql';
import { ForbiddenException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { CaptchaService } from './captcha.service';
import { OnboardingService } from './onboarding.service';
import { getTrustedClientIp } from './request-client-ip';
import { TenantMembershipService, type SessionTenantUser } from './tenant-membership.service';
import { WaWhitelistService } from './wa-whitelist.service';

@ObjectType()
class RegisterTenantResult {
    @Field()
    tenantId: string;

    @Field()
    studioSlug: string;

    @Field()
    storeId: string;

    @Field()
    userId: string;

    @Field()
    email: string;

    @Field()
    emailVerified: boolean;

    @Field({ nullable: true })
    accessToken?: string;

    @Field({ nullable: true })
    refreshToken?: string;

    @Field()
    message: string;
}

@InputType()
class RegisterTenantInput {
    @Field()
    email: string;

    @Field()
    password: string;

    @Field()
    storeName: string;

    @Field({ nullable: true })
    ownerName?: string;

    @Field()
    captchaToken: string;
}

@ObjectType()
class MyTenantStore {
    @Field()
    id: string;

    @Field()
    displayName: string;

    @Field()
    studioSlug: string;

    @Field()
    tenantId: string;
}

@ObjectType()
class WaWhitelistEntry {
    @Field()
    id: string;

    @Field()
    phone: string;

    @Field({ nullable: true })
    label?: string;

    @Field()
    isOwner: boolean;
}

@InputType()
class LinkOwnerWaInput {
    @Field()
    storeId: string;

    @Field()
    phone: string;
}

@InputType()
class AddWaStaffInput {
    @Field()
    storeId: string;

    @Field()
    phone: string;

    @Field({ nullable: true })
    label?: string;
}

type GqlCtx = { req?: import('express').Request & { user?: SessionTenantUser } };

@ObjectType()
class OnboardingCaptchaConfig {
    @Field()
    mode: string;

    @Field({ nullable: true })
    siteKey?: string;
}

@Resolver()
export class OnboardingResolver {
    constructor(
        private readonly onboarding: OnboardingService,
        private readonly membership: TenantMembershipService,
        private readonly waWhitelistService: WaWhitelistService,
        private readonly captcha: CaptchaService,
    ) {}

    @Mutation(() => Boolean)
    async linkOwnerWhatsApp(
        @Args('input') input: LinkOwnerWaInput,
        @Context() ctx: GqlCtx,
    ): Promise<boolean> {
        const user = ctx.req?.user;
        if (!user?.id) throw new Error('Authentication required');
        await this.assertStoreAccess(user, input.storeId);
        await this.waWhitelistService.addPhone(input.storeId, input.phone, { isOwner: true, label: 'owner' });
        return true;
    }

    @Mutation(() => WaWhitelistEntry)
    async addWaWhitelistStaff(
        @Args('input') input: AddWaStaffInput,
        @Context() ctx: GqlCtx,
    ): Promise<WaWhitelistEntry> {
        const user = ctx.req?.user;
        if (!user?.id) throw new Error('Authentication required');
        await this.assertStoreAccess(user, input.storeId);
        const row = await this.waWhitelistService.addPhone(input.storeId, input.phone, {
            label: input.label ?? 'staff',
            isOwner: false,
        });
        return {
            id: row.id as string,
            phone: row.phone as string,
            label: (row.label as string | null) ?? undefined,
            isOwner: Boolean(row.is_owner),
        };
    }

    @Query(() => MyTenantStore, { nullable: true })
    async myTenantStore(@Context() ctx: GqlCtx): Promise<MyTenantStore | null> {
        const user = ctx.req?.user;
        if (!user?.id) throw new Error('Authentication required');
        const tenantId = user.tenantId?.trim();
        if (!tenantId) return null;
        await this.membership.assertTenantAccess(user, tenantId);
        const data = await this.membership.storeForTenant(tenantId);
        if (!data) return null;
        return {
            id: data.id,
            displayName: data.display_name,
            studioSlug: data.studio_slug,
            tenantId: data.tenant_id,
        };
    }

    @Query(() => [WaWhitelistEntry])
    async waWhitelist(@Args('storeId') storeId: string, @Context() ctx: GqlCtx): Promise<WaWhitelistEntry[]> {
        const user = ctx.req?.user;
        if (!user?.id) throw new Error('Authentication required');
        await this.assertStoreAccess(user, storeId);
        const rows = await this.waWhitelistService.listForStore(storeId);
        return rows.map((r) => ({
            id: r.id as string,
            phone: r.phone as string,
            label: (r.label as string | null) ?? undefined,
            isOwner: Boolean(r.is_owner),
        }));
    }

    private async assertStoreAccess(user: SessionTenantUser, storeId: string): Promise<void> {
        const tenantId = await this.membership.tenantIdForStore(storeId);
        if (!tenantId) throw new Error('Store not found');
        await this.membership.assertTenantAccess(user, tenantId);
    }

    @Public()
    @Mutation(() => RegisterTenantResult)
    async registerTenant(
        @Args('input') input: RegisterTenantInput,
        @Context() ctx: GqlCtx,
    ): Promise<RegisterTenantResult> {
        return this.onboarding.registerTenant({
            email: input.email,
            password: input.password,
            storeName: input.storeName,
            ownerName: input.ownerName,
            captchaToken: input.captchaToken,
            clientIp: getTrustedClientIp(ctx.req),
        });
    }

    @Public()
    @Query(() => OnboardingCaptchaConfig)
    onboardingCaptchaConfig(): OnboardingCaptchaConfig {
        return {
            mode: this.captcha.providerMode(),
            siteKey: this.captcha.siteKey() || undefined,
        };
    }

    @Public()
    @Query(() => String)
    async onboardingCaptchaDevToken(): Promise<string> {
        try {
            return this.onboarding.mintCaptchaTokenForTests();
        } catch (e) {
            if (e instanceof ForbiddenException) {
                throw new ForbiddenException('Dev captcha mint is disabled in this environment');
            }
            throw e;
        }
    }
}
