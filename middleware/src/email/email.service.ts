import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class EmailService {
    private sb;
    constructor(private supabase: SupabaseService) { this.sb = this.supabase.getClient(); }

    async getEmailAccounts(tenantId: string) { return this.sb.from('email_accounts').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getEmailDomains(tenantId: string) { return this.sb.from('email_domains').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getEmailAliases(tenantId: string) { return this.sb.from('email_aliases').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
}