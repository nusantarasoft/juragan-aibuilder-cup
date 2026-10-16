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

    async getTagValueHistory(
        tenantId: string,
        tagIds: string[],
        from?: string,
        to?: string,
        limit = 120,
    ) {
        if (!tagIds.length) return [];

        const { data: ownedTags, error: tagErr } = await this.db
            .from('scada_tags')
            .select('id')
            .eq('tenant_id', tenantId)
            .in('id', tagIds);
        if (tagErr) throw tagErr;
        const allowed = new Set((ownedTags ?? []).map((t) => t.id));
        const scopedIds = tagIds.filter((id) => allowed.has(id));
        if (!scopedIds.length) return [];

        let query = this.db
            .from('scada_tag_values')
            .select('id, tag_id, timestamp, value_numeric, value_text, quality')
            .in('tag_id', scopedIds)
            .order('timestamp', { ascending: true })
            .limit(limit);

        if (from) query = query.gte('timestamp', from);
        if (to) query = query.lte('timestamp', to);

        const { data, error } = await query;
        if (error) throw error;
        return data ?? [];
    }

    async getActiveAlarms(tenantId: string) {
        const { data: defs, error: defErr } = await this.db
            .from('scada_alarm_definitions')
            .select('id, tag_id, name, priority, alarm_type')
            .eq('tenant_id', tenantId);
        if (defErr) throw defErr;
        if (!defs?.length) return [];

        const defById = new Map(defs.map((d) => [d.id, d]));
        const { data: events, error: evErr } = await this.db
            .from('scada_alarm_events')
            .select('*')
            .in('alarm_id', defs.map((d) => d.id))
            .is('cleared_at', null)
            .order('triggered_at', { ascending: false });
        if (evErr) throw evErr;

        return (events ?? []).map((ev) => {
            const def = defById.get(ev.alarm_id);
            return {
                ...ev,
                tag_id: def?.tag_id,
                severity: def?.priority ?? 'medium',
                message: def?.name ?? def?.alarm_type ?? 'SCADA alarm',
                status: ev.acknowledged_at ? 'acknowledged' : 'active',
                created_at: ev.triggered_at,
            };
        });
    }
}
