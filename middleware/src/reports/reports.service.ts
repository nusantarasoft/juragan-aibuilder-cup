import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ReportsService {
    private sb;
    constructor(private supabase: SupabaseService) { this.sb = this.supabase.getClient(); }

    async getAllReports(tenantId: string) { return this.sb.from('reports').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getReportSchedules(tenantId: string) { return this.sb.from('report_schedules').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getReportTemplates(tenantId: string) { return this.sb.from('report_templates').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
}