import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { isTenantWaChannelConnected } from '../agentic-os/aos-wa-outbound-gate';
import { WaWhitelistService } from './wa-whitelist.service';
import { WaOtpService } from './wa-otp.service';
import { normalizePhoneDigits } from '../studio/studio-whatsapp.util';
import { WA_WHITELIST_MAX_STAFF } from './wa-connection.constants';
import { WaDedicatedService } from './wa-dedicated.service';
import { WA_INBOX_DEDICATED, WA_INBOX_SHARED, type WaInboxMode } from './wa-dedicated.constants';

export type WaConnectionStatus = {
    storeId: string;
    studioSlug: string;
    ownerPhone: string | null;
    ownerPhoneVerified: boolean;
    kasirWaActivated: boolean;
    waConnected: boolean;
    staffCount: number;
    maxStaff: number;
    sharedInbox: boolean;
    inboxMode: WaInboxMode;
    dedicatedSessionName: string | null;
    dedicatedBusinessPhone: string | null;
    dedicatedPaired: boolean;
    dedicatedPairMock: boolean;
};

@Injectable()
export class WaConnectionService {
    constructor(
        private readonly supabase: SupabaseService,
        private readonly waWhitelist: WaWhitelistService,
        private readonly waOtp: WaOtpService,
        private readonly waDedicated: WaDedicatedService,
    ) {}

    private admin() {
        return this.supabase.getAdminClient();
    }

    async resolveStudioSlugForTenant(tenantId: string): Promise<string | null> {
        const tid = tenantId.trim();
        const { data: store } = await this.admin()
            .from('tenant_stores')
            .select('studio_slug')
            .eq('tenant_id', tid)
            .maybeSingle();
        if (store?.studio_slug) return store.studio_slug as string;

        const { data: alias } = await this.admin()
            .from('tenant_slug_aliases')
            .select('slug')
            .eq('tenant_id', tid)
            .limit(1)
            .maybeSingle();
        return (alias?.slug as string | undefined) ?? null;
    }

    private async getStoreRow(storeId: string) {
        const { data, error } = await this.admin()
            .from('tenant_stores')
            .select(
                'id, tenant_id, studio_slug, owner_phone_verified_at, wa_kasir_activated_at, wa_inbox_mode, wa_dedicated_session_name, wa_dedicated_business_phone, wa_dedicated_paired_at',
            )
            .eq('id', storeId)
            .maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) throw new NotFoundException('Store not found');
        return data as {
            id: string;
            tenant_id: string;
            studio_slug: string;
            owner_phone_verified_at: string | null;
            wa_kasir_activated_at: string | null;
            wa_inbox_mode: string;
            wa_dedicated_session_name: string | null;
            wa_dedicated_business_phone: string | null;
            wa_dedicated_paired_at: string | null;
        };
    }

    async statusForStore(storeId: string): Promise<WaConnectionStatus> {
        const store = await this.getStoreRow(storeId);
        const rows = await this.waWhitelist.listForStore(storeId);
        const owner = rows.find((r) => r.is_owner);
        const staffCount = rows.filter((r) => !r.is_owner).length;
        const ownerVerified = Boolean(store.owner_phone_verified_at);
        const activated = Boolean(store.wa_kasir_activated_at);
        const waConnected = await isTenantWaChannelConnected(this.admin(), store.tenant_id);
        const inboxMode =
            store.wa_inbox_mode === WA_INBOX_DEDICATED ? WA_INBOX_DEDICATED : WA_INBOX_SHARED;
        const dedicatedPaired = Boolean(
            store.wa_dedicated_paired_at && store.wa_dedicated_business_phone,
        );
        const pairMeta = await this.waDedicated.pairStatusForStore(storeId);

        return {
            storeId: store.id,
            studioSlug: store.studio_slug,
            ownerPhone: owner?.phone ? String(owner.phone) : null,
            ownerPhoneVerified: ownerVerified,
            kasirWaActivated: activated,
            waConnected,
            staffCount,
            maxStaff: WA_WHITELIST_MAX_STAFF,
            sharedInbox: inboxMode === WA_INBOX_SHARED,
            inboxMode,
            dedicatedSessionName: store.wa_dedicated_session_name,
            dedicatedBusinessPhone: store.wa_dedicated_business_phone,
            dedicatedPaired,
            dedicatedPairMock: pairMeta.pairMock,
        };
    }

    async requestOwnerOtp(storeId: string, phoneRaw: string, clientIp: string) {
        const phone = normalizePhoneDigits(phoneRaw);
        if (phone.length < 8) throw new BadRequestException('Nomor WhatsApp tidak valid');
        await this.getStoreRow(storeId);
        const issued = await this.waOtp.requestOtp(storeId, phone, clientIp);
        if (!issued.sent) {
            throw new BadRequestException('OTP tidak terkirim — coba lagi.');
        }
        return {
            phone,
            delivery: issued.delivery,
            mockCode: issued.mockCode,
            message:
                issued.delivery === 'mock'
                    ? 'OTP simulasi (QA) — gunakan kode yang ditampilkan'
                    : 'Kode OTP dikirim ke WhatsApp Anda',
        };
    }

    async verifyOwnerOtp(storeId: string, phoneRaw: string, code: string) {
        const phone = normalizePhoneDigits(phoneRaw);
        this.waOtp.verifyOtp(storeId, phone, code);
        await this.waWhitelist.addPhone(storeId, phone, { isOwner: true, label: 'owner' });
        const { error } = await this.admin()
            .from('tenant_stores')
            .update({ owner_phone_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', storeId);
        if (error) throw new Error(error.message);
        return this.statusForStore(storeId);
    }

    async activateKasirWa(storeId: string) {
        const store = await this.getStoreRow(storeId);
        await this.waDedicated.assertDedicatedReadyIfNeeded(storeId);
        if (!store.owner_phone_verified_at) {
            throw new BadRequestException('Verifikasi nomor pemilik dulu sebelum Aktifkan');
        }
        const rows = await this.waWhitelist.listForStore(storeId);
        if (!rows.some((r) => r.is_owner)) {
            throw new BadRequestException('Nomor pemilik belum terdaftar');
        }

        const { error: actErr } = await this.admin()
            .from('tenant_stores')
            .update({ wa_kasir_activated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', storeId);
        if (actErr) throw new Error(actErr.message);

        const { data: cfg } = await this.admin()
            .from('studio_whatsapp_config')
            .select('notebook_id')
            .eq('tenant_id', store.studio_slug)
            .maybeSingle();
        if (!cfg?.notebook_id) {
            throw new BadRequestException('Notebook Kasir belum siap — hubungi support');
        }

        const { error: enErr } = await this.admin()
            .from('studio_whatsapp_config')
            .update({ enabled: true, updated_at: new Date().toISOString() })
            .eq('tenant_id', store.studio_slug);
        if (enErr) throw new Error(enErr.message);

        await this.waWhitelist.syncStudioAllowlist(storeId);
        return this.statusForStore(storeId);
    }
}
