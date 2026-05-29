import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AutomationService {
    private sb;
    constructor(private supabase: SupabaseService) { this.sb = this.supabase.getClient(); }

    async getAutomationWorkflows(tenantId: string) { return this.sb.from('automation_workflows').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getAutomationRuns(tenantId: string) { return this.sb.from('automation_runs').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getAutomationSchedules(tenantId: string) { return this.sb.from('automation_schedules').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
}