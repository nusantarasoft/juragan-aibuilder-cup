import type { SupabaseClient } from '@supabase/supabase-js';

/** F2-3 prep: outbound customer WA/email blocked until channel is connected. */
export async function isTenantWaChannelConnected(
    db: SupabaseClient,
    tenantId: string,
): Promise<boolean> {
    const { data } = await db
        .from('studio_whatsapp_config')
        .select('enabled, notebook_id')
        .eq('tenant_id', tenantId)
        .maybeSingle();
    if (!data) return false;
    const row = data as { enabled?: boolean; notebook_id?: string | null };
    return Boolean(row.enabled && row.notebook_id);
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
