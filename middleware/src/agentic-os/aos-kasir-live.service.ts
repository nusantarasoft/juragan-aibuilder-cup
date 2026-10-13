import { Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { HermesProvider } from '../whatsapp/hermes.provider';
import { SupabaseService } from '../supabase/supabase.service';
import { AOS_DEFAULT_TENANT, AosKasirLiveSnapshot } from './agentic-os.types';
import { tenantOf } from './agentic-os.service';

const JAKARTA = 'Asia/Jakarta';
export const KASIR_EMPLOYEE_SLUG = 'umkm-kasir';

/** Start/end of "today" in Jakarta, as UTC ISO strings for Supabase filters. */
export function jakartaTodayUtcBounds(now = new Date()): { startIso: string; endIso: string } {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: JAKARTA,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(now);
    const y = parts.find((p) => p.type === 'year')!.value;
    const m = parts.find((p) => p.type === 'month')!.value;
    const d = parts.find((p) => p.type === 'day')!.value;
    const startIso = new Date(`${y}-${m}-${d}T00:00:00+07:00`).toISOString();
    const endIso = new Date(`${y}-${m}-${d}T24:00:00+07:00`).toISOString();
    return { startIso, endIso };
}

@Injectable()
export class AosKasirLiveService {
    private readonly logger = new Logger(AosKasirLiveService.name);

    constructor(
        private readonly supabase: SupabaseService,
        private readonly hermes: HermesProvider,
    ) {}

    private admin(): SupabaseClient {
        return this.supabase.getAdminClient();
    }

    async getSnapshot(tenantId?: string | null): Promise<AosKasirLiveSnapshot> {
        const requested = tenantOf(tenantId);
        const unavailable = (reason: string): AosKasirLiveSnapshot => ({
            available: false,
            tenantId: requested,
            slug: KASIR_EMPLOYEE_SLUG,
            name: 'Kasir UMKM',
            role: 'UMKM WhatsApp Kasir',
            source: 'ai_studio',
            unavailableReason: reason,
            waChatsToday: null,
            transactionsToday: null,
            lastActivityAt: null,
            waOnline: null,
        });

        try {
            const { effectiveTenant, label } = await this.resolveWaTenant(requested);
            if (!effectiveTenant) {
                return unavailable('data tidak tersedia');
            }

            const { startIso, endIso } = jakartaTodayUtcBounds();

            const [chatsRes, ordersRes, lastWa, lastOrder, session] = await Promise.all([
                this.admin()
                    .from('studio_whatsapp_sessions')
                    .select('id', { count: 'exact', head: true })
                    .eq('tenant_id', effectiveTenant)
                    .gte('last_message_at', startIso)
                    .lt('last_message_at', endIso),
                this.admin()
                    .from('ecom_orders')
                    .select('id', { count: 'exact', head: true })
                    .eq('tenant_id', effectiveTenant)
                    .gte('created_at', startIso)
                    .lt('created_at', endIso),
                this.admin()
                    .from('studio_whatsapp_sessions')
                    .select('last_message_at')
                    .eq('tenant_id', effectiveTenant)
                    .order('last_message_at', { ascending: false })
                    .limit(1)
                    .maybeSingle(),
                this.admin()
                    .from('ecom_orders')
                    .select('created_at')
                    .eq('tenant_id', effectiveTenant)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle(),
                this.hermes.getSessionStatus(),
            ]);

            if (chatsRes.error || ordersRes.error) {
                this.logger.warn(
                    `Kasir live read failed tenant=${effectiveTenant}: ${chatsRes.error?.message ?? ordersRes.error?.message}`,
                );
                return unavailable('data tidak tersedia');
            }

            const waTs = lastWa.data?.last_message_at ? String(lastWa.data.last_message_at) : null;
            const orderTs = lastOrder.data?.created_at ? String(lastOrder.data.created_at) : null;
            const lastActivityAt =
                waTs && orderTs
                    ? waTs > orderTs
                        ? waTs
                        : orderTs
                    : waTs ?? orderTs;

            return {
                available: true,
                tenantId: effectiveTenant,
                slug: KASIR_EMPLOYEE_SLUG,
                name: label?.trim() || 'Kasir UMKM',
                role: 'UMKM WhatsApp Kasir',
                source: 'ai_studio',
                unavailableReason: null,
                waChatsToday: chatsRes.count ?? 0,
                transactionsToday: ordersRes.count ?? 0,
                lastActivityAt,
                waOnline: Boolean(session?.connected),
            };
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            this.logger.warn(`Kasir live snapshot error: ${msg}`);
            return unavailable('data tidak tersedia');
        }
    }

    /** Map AOS tenant id to studio_whatsapp_config.tenant_id (often `default`). */
    private async resolveWaTenant(requested: string): Promise<{ effectiveTenant: string | null; label: string | null }> {
        const candidates = [...new Set([requested, 'default', AOS_DEFAULT_TENANT])];
        for (const tid of candidates) {
            const { data, error } = await this.admin()
                .from('studio_whatsapp_config')
                .select('tenant_id,label,enabled')
                .eq('tenant_id', tid)
                .maybeSingle();
            if (error) {
                this.logger.warn(`studio_whatsapp_config read: ${error.message}`);
                return { effectiveTenant: null, label: null };
            }
            if (data?.tenant_id) {
                return {
                    effectiveTenant: String(data.tenant_id),
                    label: data.label != null ? String(data.label) : null,
                };
            }
        }
        return { effectiveTenant: null, label: null };
    }
}
