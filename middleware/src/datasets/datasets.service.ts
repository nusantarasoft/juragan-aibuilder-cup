import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DatasetsService {
    private sb;
    constructor(private supabase: SupabaseService) { this.sb = this.supabase.getClient(); }

    async getAllDatasets(tenantId: string) { return this.sb.from('datasets').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getDatasetSources(tenantId: string) { return this.sb.from('dataset_sources').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getDatasetColumns(tenantId: string) { return this.sb.from('dataset_columns').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
}