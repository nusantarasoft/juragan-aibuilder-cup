import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DevopsService {
    private sb;
    constructor(private supabase: SupabaseService) { this.sb = this.supabase.getClient(); }

    async getDevopsPipelines(tenantId: string) { return this.sb.from('devops_pipelines').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getDevopsBuilds(tenantId: string) { return this.sb.from('devops_builds').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getDevopsDeployments(tenantId: string) { return this.sb.from('devops_deployments').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
}