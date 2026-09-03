import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';
import { StudioUmkmService } from './studio-umkm.service';
import { StudioWhatsAppService } from './studio-whatsapp.service';

/**
 * Daily UMKM sales report push + pending-sale cleanup.
 * Cron: 20:00 Asia/Jakarta (UTC+7) ≈ 13:00 UTC → use '0 13 * * *' unless TZ set.
 * Override with STUDIO_UMKM_DAILY_REPORT_CRON (standard 5-field cron).
 */
@Injectable()
export class StudioUmkmCronService {
    private readonly logger = new Logger(StudioUmkmCronService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly supabaseService: SupabaseService,
        private readonly umkmService: StudioUmkmService,
        private readonly whatsappService: StudioWhatsAppService,
    ) {}

    private admin() {
        return this.supabaseService.getAdminClient();
    }

    /** Expire stale pending sales, purchases, and wizards hourly. */
    @Cron('15 * * * *', { name: 'studio-umkm-expire-pending' })
    async expirePendingSales(): Promise<void> {
        const now = new Date().toISOString();
        try {
            const tables: Array<{ table: string; statusCol: string; active: string; label: string }> =
                [
                    {
                        table: 'studio_umkm_pending_sales',
                        statusCol: 'status',
                        active: 'pending',
                        label: 'sale',
                    },
                    {
                        table: 'studio_umkm_pending_purchases',
                        statusCol: 'status',
                        active: 'pending',
                        label: 'purchase',
                    },
                    {
                        table: 'studio_umkm_session_wizards',
                        statusCol: 'status',
                        active: 'active',
                        label: 'wizard',
                    },
                ];
            for (const t of tables) {
                const expiredStatus = t.table.includes('wizard') ? 'expired' : 'expired';
                const { error, count } = await this.admin()
                    .from(t.table)
                    .update({ [t.statusCol]: expiredStatus, updated_at: now })
                    .eq(t.statusCol, t.active)
                    .lt('expires_at', now);
                if (error) {
                    this.logger.warn(`expirePending ${t.label}: ${error.message}`);
                    continue;
                }
                if (count && count > 0) {
                    this.logger.log(`Expired ${count} UMKM pending ${t.label}(s)`);
                }
            }
        } catch (e: any) {
            this.logger.warn(`expirePendingSales error: ${e?.message}`);
        }
    }

    /**
     * Push daily sales report to allowlisted phones for each enabled UMKM WhatsApp config.
     * Disabled by default; set STUDIO_UMKM_DAILY_REPORT_ENABLED=true to enable. Cron stays registered.
     */
    @Cron('0 13 * * *', { name: 'studio-umkm-daily-report' })
    async pushDailyReports(): Promise<void> {
        const enabled =
            (this.configService.get('STUDIO_UMKM_DAILY_REPORT_ENABLED') ?? 'false').toString() !==
            'false';
        if (!enabled) {
            this.logger.debug('Daily UMKM report cron skipped (disabled)');
            return;
        }

        this.logger.log('Starting UMKM daily sales report push...');
        try {
            const configs = await this.whatsappService.listEnabledConfigsForCron();
            let sent = 0;
            for (const cfg of configs) {
                if (!cfg.notebook_id) continue;
                const phones = Array.isArray(cfg.allowlist_phones) ? cfg.allowlist_phones : [];
                if (phones.length === 0 && cfg.business_phone) {
                    phones.push(cfg.business_phone);
                }
                if (phones.length === 0) continue;

                const report = await this.umkmService.buildDailyReportMessage(cfg.tenant_id);
                const header = `📅 *Laporan harian otomatis*\nTenant: ${cfg.label || cfg.tenant_id}\n\n`;
                for (const phone of phones) {
                    const ok = await this.whatsappService.sendOutboundText(
                        phone,
                        header + report,
                        cfg.session_name || undefined,
                    );
                    if (ok) sent += 1;
                }
            }
            this.logger.log(`UMKM daily report push done: ${sent} message(s)`);
        } catch (e: any) {
            this.logger.error(`pushDailyReports failed: ${e?.message}`, e?.stack);
        }
    }
}
