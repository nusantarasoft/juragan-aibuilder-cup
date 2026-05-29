import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class IntegrationsService {
    private sb;
    constructor(private supabase: SupabaseService) { this.sb = this.supabase.getClient(); }

    async getIntegrationsInstalled(tenantId: string) { return this.sb.from('integrations_installed').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getIntegrationsMarketplace(tenantId: string) { return this.sb.from('integrations_marketplace').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getIntegrationsWebhookLogs(tenantId: string) { return this.sb.from('integrations_webhook_logs').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
}