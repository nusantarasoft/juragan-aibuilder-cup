import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuditService {
    private sb;
    constructor(private supabase: SupabaseService) { this.sb = this.supabase.getClient(); }

    async getAuditLogs(tenantId: string) { return this.sb.from('audit_logs').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getAuditRetentionPolicies(tenantId: string) { return this.sb.from('audit_data_retention_policies').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
}