import type { SupabaseClient } from '@supabase/supabase-js';
import { WA_INBOX_DEDICATED } from '../onboarding/wa-dedicated.constants';

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveStudioSlug(db: SupabaseClient, tenantId: string): Promise<string> {
    const tid = tenantId.trim();
    if (!UUID_RE.test(tid)) return tid;

    const { data: store } = await db
        .from('tenant_stores')
        .select('studio_slug, owner_phone_verified_at, wa_kasir_activated_at')
        .eq('tenant_id', tid)
        .maybeSingle();

    if (store?.studio_slug) {
        return store.studio_slug as string;
    }

    const { data: alias } = await db
        .from('tenant_slug_aliases')
        .select('slug')
        .eq('tenant_id', tid)
        .limit(1)
        .maybeSingle();
    return (alias?.slug as string | undefined) ?? tid;
}

async function storeConnectionFlags(
    db: SupabaseClient,
    tenantId: string,
): Promise<{ verified: boolean; activated: boolean }> {
    if (!UUID_RE.test(tenantId.trim())) {
        return { verified: true, activated: true };
    }
    const { data: store } = await db
        .from('tenant_stores')
        .select(
            'owner_phone_verified_at, wa_kasir_activated_at, wa_inbox_mode, wa_dedicated_paired_at, wa_dedicated_business_phone',
        )
        .eq('tenant_id', tenantId.trim())
        .maybeSingle();
    const dedicatedReady =
        store?.wa_inbox_mode !== WA_INBOX_DEDICATED ||
        Boolean(store?.wa_dedicated_paired_at && store?.wa_dedicated_business_phone);
    return {
        verified: Boolean(store?.owner_phone_verified_at) && dedicatedReady,
        activated: Boolean(store?.wa_kasir_activated_at) && dedicatedReady,
    };
}

/** F2-3: outbound customer WA blocked until owner verified + Kasir WA activated + notebook. */
export async function isTenantWaChannelConnected(
    db: SupabaseClient,
    tenantId: string,
): Promise<boolean> {
    const slug = await resolveStudioSlug(db, tenantId);
    const flags = await storeConnectionFlags(db, tenantId);

    const { data } = await db
        .from('studio_whatsapp_config')
        .select('enabled, notebook_id')
        .eq('tenant_id', slug)
        .maybeSingle();
    if (!data) return false;
    const row = data as { enabled?: boolean; notebook_id?: string | null };
    if (!row.notebook_id) return false;
    if (!flags.verified || !flags.activated) return false;
    return Boolean(row.enabled);
}

export class WaOutboundBlockedError extends Error {
    constructor(message = 'WhatsApp belum terhubung — hubungkan channel (F2-3) sebelum kirim ke pelanggan.') {
        super(message);
        this.name = 'WaOutboundBlockedError';
    }
}

export async function assertTenantOutboundCustomerSendAllowed(
    db: SupabaseClient,
    tenantId: string,
): Promise<void> {
    if (await isTenantWaChannelConnected(db, tenantId)) return;
    throw new WaOutboundBlockedError();
}
