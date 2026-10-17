import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { HermesProvider } from '../whatsapp/hermes.provider';
import { normalizePhoneDigits } from '../studio/studio-whatsapp.util';
import {
    WA_DEDICATED_SESSION_MAX_LEN,
    WA_INBOX_DEDICATED,
    WA_INBOX_SHARED,
    WA_SHARED_SESSION_NAME,
    type WaInboxMode,
} from './wa-dedicated.constants';

export type DedicatedWaPairStatus = {
    inboxMode: WaInboxMode;
    sessionName: string | null;
    businessPhone: string | null;
    paired: boolean;
    hermesConnected: boolean;
    hermesStatus: string | null;
    pairMock: boolean;
};

function isTruthyFlag(raw: string | undefined): boolean {
    const v = (raw ?? '').toString().trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function isProductionNode(config: ConfigService): boolean {
    return (config.get('NODE_ENV') ?? process.env.NODE_ENV ?? '').toString() === 'production';
}

/** Stable Hermes session id for a store slug. */
export function buildDedicatedSessionName(studioSlug: string): string {
    const base = studioSlug
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    const name = `umkm-${base || 'store'}`.slice(0, WA_DEDICATED_SESSION_MAX_LEN);
    return name.replace(/-+$/g, '') || 'umkm-store';
}

function meIdToDigits(meId?: string | null): string | null {
    if (!meId) return null;
    const digits = normalizePhoneDigits(meId.split(':')[0] || meId);
    return digits.length >= 8 ? digits : null;
}

@Injectable()
export class WaDedicatedService {
    constructor(
        private readonly supabase: SupabaseService,
        private readonly config: ConfigService,
        private readonly hermes: HermesProvider,
    ) {}

    private admin() {
        return this.supabase.getAdminClient();
    }

    isPairMockMode(): boolean {
        if (isProductionNode(this.config)) return false;
        return isTruthyFlag(
            (this.config.get('WA_DEDICATED_PAIR_MOCK') ?? process.env.WA_DEDICATED_PAIR_MOCK) as
                | string
                | undefined,
        );
    }

    /** Live tenant QR requires explicit env (ops can enable per stack). */
    isLiveTenantPairAllowed(): boolean {
        if (this.isPairMockMode()) return true;
        return isTruthyFlag(
            (this.config.get('WA_TENANT_DEDICATED_PAIR') ??
                process.env.WA_TENANT_DEDICATED_PAIR) as string | undefined,
        );
    }

    private async getStoreRow(storeId: string) {
        const { data, error } = await this.admin()
            .from('tenant_stores')
            .select(
                'id, tenant_id, studio_slug, wa_inbox_mode, wa_dedicated_session_name, wa_dedicated_business_phone, wa_dedicated_paired_at, owner_phone_verified_at',
            )
            .eq('id', storeId)
            .maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) throw new NotFoundException('Store not found');
        return data as {
            id: string;
            tenant_id: string;
            studio_slug: string;
            wa_inbox_mode: string;
            wa_dedicated_session_name: string | null;
            wa_dedicated_business_phone: string | null;
            wa_dedicated_paired_at: string | null;
            owner_phone_verified_at: string | null;
        };
    }

    async pairStatusForStore(storeId: string): Promise<DedicatedWaPairStatus> {
        const store = await this.getStoreRow(storeId);
        const mode = store.wa_inbox_mode === WA_INBOX_DEDICATED ? WA_INBOX_DEDICATED : WA_INBOX_SHARED;
        const sessionName = store.wa_dedicated_session_name;
        const paired = Boolean(store.wa_dedicated_paired_at && store.wa_dedicated_business_phone);

        if (mode !== WA_INBOX_DEDICATED || !sessionName) {
            return {
                inboxMode: mode,
                sessionName: sessionName || null,
                businessPhone: store.wa_dedicated_business_phone,
                paired,
                hermesConnected: false,
                hermesStatus: null,
                pairMock: this.isPairMockMode(),
            };
        }

        if (this.isPairMockMode()) {
            return {
                inboxMode: mode,
                sessionName,
                businessPhone: store.wa_dedicated_business_phone,
                paired,
                hermesConnected: paired,
                hermesStatus: paired ? 'CONNECTED' : 'SCAN_QR_CODE',
                pairMock: true,
            };
        }

        const st = await this.hermes.getSessionStatus(sessionName);
        return {
            inboxMode: mode,
            sessionName,
            businessPhone: store.wa_dedicated_business_phone,
            paired,
            hermesConnected: Boolean(st?.connected),
            hermesStatus: st?.status ?? null,
            pairMock: false,
        };
    }

    async optInDedicatedInbox(storeId: string): Promise<DedicatedWaPairStatus> {
        const store = await this.getStoreRow(storeId);
        if (!store.owner_phone_verified_at) {
            throw new BadRequestException('Verifikasi nomor pemilik dulu sebelum nomor bisnis dedicated');
        }
        if (store.wa_inbox_mode === WA_INBOX_DEDICATED) {
            return this.pairStatusForStore(storeId);
        }

        const sessionName = buildDedicatedSessionName(store.studio_slug);
        const { error: storeErr } = await this.admin()
            .from('tenant_stores')
            .update({
                wa_inbox_mode: WA_INBOX_DEDICATED,
                wa_dedicated_session_name: sessionName,
                updated_at: new Date().toISOString(),
            })
            .eq('id', storeId);
        if (storeErr) throw new Error(storeErr.message);

        const { error: cfgErr } = await this.admin()
            .from('studio_whatsapp_config')
            .update({
                session_name: sessionName,
                updated_at: new Date().toISOString(),
            })
            .eq('tenant_id', store.studio_slug);
        if (cfgErr) throw new Error(cfgErr.message);

        return this.pairStatusForStore(storeId);
    }

    async disconnectDedicatedInbox(storeId: string): Promise<DedicatedWaPairStatus> {
        const store = await this.getStoreRow(storeId);
        if (store.wa_inbox_mode !== WA_INBOX_DEDICATED) {
            return this.pairStatusForStore(storeId);
        }

        const sessionName = store.wa_dedicated_session_name;
        if (sessionName && this.isLiveTenantPairAllowed() && !this.isPairMockMode()) {
            await this.hermes.logoutSession(sessionName);
        }

        const { error: storeErr } = await this.admin()
            .from('tenant_stores')
            .update({
                wa_inbox_mode: WA_INBOX_SHARED,
                wa_dedicated_session_name: null,
                wa_dedicated_business_phone: null,
                wa_dedicated_paired_at: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', storeId);
        if (storeErr) throw new Error(storeErr.message);

        const sharedSession =
            (this.config.get('KASIR_PIPE_SESSION') as string | undefined)?.trim() ||
            WA_SHARED_SESSION_NAME;

        const { error: cfgErr } = await this.admin()
            .from('studio_whatsapp_config')
            .update({
                session_name: sharedSession,
                updated_at: new Date().toISOString(),
            })
            .eq('tenant_id', store.studio_slug);
        if (cfgErr) throw new Error(cfgErr.message);

        return this.pairStatusForStore(storeId);
    }

    async startDedicatedPair(storeId: string): Promise<DedicatedWaPairStatus> {
        const store = await this.getStoreRow(storeId);
        if (store.wa_inbox_mode !== WA_INBOX_DEDICATED || !store.wa_dedicated_session_name) {
            throw new BadRequestException('Aktifkan mode nomor bisnis dedicated dulu');
        }

        if (this.isPairMockMode()) {
            const mockPhone =
                normalizePhoneDigits(
                    (this.config.get('WA_DEDICATED_PAIR_MOCK_PHONE') ??
                        process.env.WA_DEDICATED_PAIR_MOCK_PHONE ??
                        '6281999900001') as string,
                ) || '6281999900001';
            await this.persistPairSuccess(storeId, mockPhone);
            return this.pairStatusForStore(storeId);
        }

        if (!this.isLiveTenantPairAllowed()) {
            throw new BadRequestException(
                'Pairing live dedicated belum diaktifkan di stack ini — gunakan Demo (WA_DEDICATED_PAIR_MOCK) atau hubungi support',
            );
        }

        await this.hermes.startSession(false, store.wa_dedicated_session_name);
        return this.pairStatusForStore(storeId);
    }

    async syncDedicatedPair(storeId: string): Promise<DedicatedWaPairStatus> {
        const store = await this.getStoreRow(storeId);
        if (store.wa_inbox_mode !== WA_INBOX_DEDICATED || !store.wa_dedicated_session_name) {
            return this.pairStatusForStore(storeId);
        }

        if (this.isPairMockMode()) {
            return this.pairStatusForStore(storeId);
        }

        const st = await this.hermes.getSessionStatus(store.wa_dedicated_session_name);
        if (st?.connected && st.meId) {
            const phone = meIdToDigits(st.meId);
            if (phone) {
                await this.persistPairSuccess(storeId, phone);
            }
        }
        return this.pairStatusForStore(storeId);
    }

    private async persistPairSuccess(storeId: string, businessPhone: string) {
        const phone = normalizePhoneDigits(businessPhone);
        if (phone.length < 8) throw new BadRequestException('Nomor bisnis tidak valid dari Hermes');

        const store = await this.getStoreRow(storeId);
        const { error: storeErr } = await this.admin()
            .from('tenant_stores')
            .update({
                wa_dedicated_business_phone: phone,
                wa_dedicated_paired_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', storeId);
        if (storeErr) throw new Error(storeErr.message);

        const { error: cfgErr } = await this.admin()
            .from('studio_whatsapp_config')
            .update({
                business_phone: phone,
                updated_at: new Date().toISOString(),
            })
            .eq('tenant_id', store.studio_slug);
        if (cfgErr) throw new Error(cfgErr.message);
    }

    /** Fail-closed guard for outbound + activation when dedicated but not paired. */
    async assertDedicatedReadyIfNeeded(storeId: string): Promise<void> {
        const store = await this.getStoreRow(storeId);
        if (store.wa_inbox_mode !== WA_INBOX_DEDICATED) return;
        if (!store.wa_dedicated_paired_at || !store.wa_dedicated_business_phone) {
            throw new BadRequestException(
                'Nomor bisnis dedicated belum ter-pair — selesaikan QR atau putuskan kembali ke inbox bersama',
            );
        }
    }

    async authQrForStore(storeId: string): Promise<{
        available: boolean;
        qr?: string;
        error?: string;
        pairMock: boolean;
    }> {
        const meta = await this.pairStatusForStore(storeId);
        if (meta.inboxMode !== WA_INBOX_DEDICATED || !meta.sessionName) {
            return { available: false, pairMock: meta.pairMock, error: 'Dedicated inbox not enabled' };
        }
        if (this.isPairMockMode()) {
            return {
                available: false,
                pairMock: true,
                error: 'Demo mode — pairing simulasi via Mulai pair (mock)',
            };
        }
        const qr = await this.hermes.getAuthQr(meta.sessionName);
        return {
            available: Boolean(qr.available),
            qr: qr.qr || undefined,
            error: qr.error || undefined,
            pairMock: false,
        };
    }

    async isDedicatedInboxReadyForTenantUuid(db: ReturnType<SupabaseService['getAdminClient']>, tenantId: string): Promise<boolean> {
        const { data } = await db
            .from('tenant_stores')
            .select('wa_inbox_mode, wa_dedicated_paired_at, wa_dedicated_business_phone')
            .eq('tenant_id', tenantId.trim())
            .maybeSingle();
        if (!data || data.wa_inbox_mode !== WA_INBOX_DEDICATED) return true;
        return Boolean(data.wa_dedicated_paired_at && data.wa_dedicated_business_phone);
    }
}
