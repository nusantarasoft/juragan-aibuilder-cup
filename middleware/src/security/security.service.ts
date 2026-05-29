import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SecurityService {
    private sb;
    constructor(private supabase: SupabaseService) { this.sb = this.supabase.getClient(); }

    async getSecurityPolicies(tenantId: string) { return this.sb.from('security_policies').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getSecurityEvents(tenantId: string) { return this.sb.from('security_events').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
}