import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ScadaService {
    private readonly logger = new Logger(ScadaService.name);

    constructor(private supabaseService: SupabaseService) { }

    private get db() {
        return this.supabaseService.getAdminClient();
    }

    async getDataSources(tenantId: string) {
        const { data, error } = await this.db.from('scada_data_sources').select('*').eq('tenant_id', tenantId).order('name');
        if (error) throw error;
        return data;
    }

    async getTags(tenantId: string, sourceId?: string) {
        let query = this.db.from('scada_tags').select('*').eq('tenant_id', tenantId);
        if (sourceId) query = query.eq('source_id', sourceId);
        const { data, error } = await query.order('name');
        if (error) throw error;
        return data;
    }

    async getAlarmDefinitions(tenantId: string) {
        const { data, error } = await this.db.from('scada_alarm_definitions').select('*').eq('tenant_id', tenantId).order('name');
        if (error) throw error;
        return data;
    }

    async getActiveAlarms(tenantId: string) {
        const { data, error } = await this.db.from('scada_alarm_events').select('*').eq('tenant_id', tenantId).eq('status', 'active').order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }
}
