import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class BimService {
    private readonly logger = new Logger(BimService.name);

    constructor(private supabaseService: SupabaseService) { }

    private get db() {
        return this.supabaseService.getAdminClient();
    }

    async getModels(tenantId: string) {
        const { data, error } = await this.db.from('bim_models').select('*').eq('tenant_id', tenantId).order('name');
        if (error) throw error;
        return data;
    }

    async getElements(tenantId: string, modelId: string) {
        const { data, error } = await this.db.from('bim_elements').select('*').eq('tenant_id', tenantId).eq('model_id', modelId);
        if (error) throw error;
        return data;
    }

    async getIssues(tenantId: string, modelId?: string) {
        let query = this.db.from('bim_issues').select('*').eq('tenant_id', tenantId);
        if (modelId) query = query.eq('model_id', modelId);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getClashResults(tenantId: string, modelId?: string) {
        let query = this.db.from('bim_clash_results').select('*').eq('tenant_id', tenantId);
        if (modelId) query = query.eq('model_id', modelId);
        const { data, error } = await query.order('severity', { ascending: false });
        if (error) throw error;
        return data;
    }
}
