import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { StudioService } from '../studio/studio.service';
import { StudioUmkmService } from '../studio/studio-umkm.service';
import { StudioWhatsAppService } from '../studio/studio-whatsapp.service';
import { WaWhitelistService } from './wa-whitelist.service';
import { normalizePhoneDigits } from '../studio/studio-whatsapp.util';

export type ProvisionSource = 'web' | 'wa_daftar';

export interface ProvisionStoreInput {
    source: ProvisionSource;
    storeDisplayName: string;
    ownerUserId?: string | null;
    ownerEmail?: string | null;
    ownerName?: string | null;
    ownerPhone?: string | null;
    preferredSlug?: string | null;
}

export interface ProvisionStoreResult {
    tenantId: string;
    studioSlug: string;
    storeId: string;
}

function slugifyStore(name: string): string {
    const raw = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);
    return `umkm-${raw || 'toko'}`;
}

@Injectable()
export class TenantProvisioningService {
    private readonly logger = new Logger(TenantProvisioningService.name);

    constructor(
        private readonly supabase: SupabaseService,
        private readonly studioService: StudioService,
        private readonly studioUmkmService: StudioUmkmService,
        private readonly studioWhatsAppService: StudioWhatsAppService,
        private readonly waWhitelist: WaWhitelistService,
    ) {}

    private admin() {
        return this.supabase.getAdminClient();
    }

    async provisionStore(input: ProvisionStoreInput): Promise<ProvisionStoreResult> {
        const displayName = (input.storeDisplayName || '').trim();
        if (displayName.length < 2) {
            throw new BadRequestException('Store name is required');
        }

        if (input.source === 'web' && input.ownerUserId) {
            const existing = await this.admin()
                .from('tenant_users')
                .select('tenant_id')
                .eq('user_id', input.ownerUserId)
                .maybeSingle();
            if (existing.data?.tenant_id) {
                throw new BadRequestException('Owner already has a store (v1: one store per owner)');
            }
        }

        let studioSlug = (input.preferredSlug || slugifyStore(displayName)).slice(0, 64);
        const aliasTaken = await this.admin()
            .from('tenant_slug_aliases')
            .select('slug')
            .eq('slug', studioSlug)
            .maybeSingle();
        if (aliasTaken.data?.slug && input.source === 'web') {
            studioSlug = `${studioSlug}-${Date.now().toString(36).slice(-4)}`.slice(0, 64);
        }

        const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        const tenantSlug = `t-${studioSlug}`.slice(0, 100);

        const { data: tenant, error: tenantErr } = await this.admin()
            .from('tenants')
            .insert({
                name: displayName,
                slug: tenantSlug,
                subscription_plan: 'trial',
                trial_ends_at: trialEnds,
                settings: {
                    modules: ['aos', 'vo'],
                    onboarding: {
                        source: input.source,
                        storeDisplayName: displayName,
                        waPhone: input.ownerPhone ?? null,
                    },
                },
                is_active: true,
            })
            .select('id')
            .single();
        if (tenantErr || !tenant) {
            throw new BadRequestException(tenantErr?.message || 'Failed to create tenant');
        }

        const tenantId = tenant.id as string;

        await this.admin().from('tenant_slug_aliases').upsert(
            { slug: studioSlug, tenant_id: tenantId },
            { onConflict: 'slug' },
        );

        const { data: store, error: storeErr } = await this.admin()
            .from('tenant_stores')
            .insert({
                tenant_id: tenantId,
                display_name: displayName,
                studio_slug: studioSlug,
            })
            .select('id')
            .single();
        if (storeErr || !store) {
            throw new BadRequestException(storeErr?.message || 'Failed to create store');
        }

        if (input.ownerUserId) {
            await this.admin().from('user_profiles').upsert({
                id: input.ownerUserId,
                email: input.ownerEmail ?? `${input.ownerUserId}@tenant.local`,
                role: 'tenant_owner',
                status: 'active',
                full_name: input.ownerName ?? displayName,
            });
            await this.admin().from('tenant_users').insert({
                tenant_id: tenantId,
                user_id: input.ownerUserId,
                is_active: true,
                title: 'Owner',
            });
        }

        const notebook = await this.studioService.createNotebook(
            displayName,
            input.source === 'wa_daftar'
                ? 'UMKM penjualan via WhatsApp (DAFTAR)'
                : 'Toko web signup — hubungkan WA setelah verifikasi email',
            input.ownerUserId ?? 'system',
            'customer',
        );
        await this.studioUmkmService.setupUmkmNotebook(notebook.id, studioSlug);

        const ownerPhone = input.ownerPhone ? normalizePhoneDigits(input.ownerPhone) : '';
        await this.studioWhatsAppService.updateConfig(
            {
                notebookId: notebook.id,
                enabled: input.source === 'wa_daftar' && ownerPhone.length >= 8,
                allowlistPhones: [],
                useGuidedFlow: false,
                sessionName: 'default',
                businessPhone: ownerPhone.length >= 8 ? ownerPhone : null,
                label: displayName,
            },
            studioSlug,
        );

        if (ownerPhone.length >= 8) {
            await this.waWhitelist.addPhone(store.id as string, ownerPhone, {
                isOwner: true,
                label: 'owner',
            });
        }

        this.logger.log(`Provisioned tenant ${tenantId} slug=${studioSlug} source=${input.source}`);
        return {
            tenantId,
            studioSlug,
            storeId: store.id as string,
        };
    }
}
