import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AnalyticsService {
    private sb;
    constructor(private supabase: SupabaseService) { this.sb = this.supabase.getClient(); }

    async getAnalyticsEvents(tenantId: string) { return this.sb.from('analytics_events').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getAnalyticsMetrics(tenantId: string) { return this.sb.from('analytics_metrics').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
}