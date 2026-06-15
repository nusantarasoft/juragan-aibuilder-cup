import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class BmsService {
    private readonly logger = new Logger(BmsService.name);

    constructor(private supabaseService: SupabaseService) { }

    private get db() {
        return this.supabaseService.getAdminClient();
    }

    // ─── SYSTEMS & ZONES ────────────────────────────────────
    async getSystems(tenantId: string) {
        const { data, error } = await this.db.from('bms_systems').select('*').eq('tenant_id', tenantId).order('name');
        if (error) throw error;
        return data;
    }

    async getZones(tenantId: string, systemId?: string) {
        let query = this.db.from('bms_zones').select('*').eq('tenant_id', tenantId);
        if (systemId) query = query.eq('system_id', systemId);
        const { data, error } = await query.order('name');
        if (error) throw error;
        return data;
    }

    // ─── EQUIPMENT ──────────────────────────────────────────
    async getEquipment(tenantId: string, filters?: { systemId?: string, zoneId?: string, status?: string }) {
        let query = this.db.from('bms_equipment').select('*').eq('tenant_id', tenantId);
        if (filters?.systemId) query = query.eq('system_id', filters.systemId);
        if (filters?.zoneId) query = query.eq('zone_id', filters.zoneId);
        if (filters?.status) query = query.eq('status', filters.status);
        const { data, error } = await query.order('name');
        if (error) throw error;
        return data;
    }

    // ─── ALARMS ─────────────────────────────────────────────
    async getAlarms(tenantId: string, systemId?: string) {
        let query = this.db.from('bms_alarms').select('*').eq('tenant_id', tenantId);
        if (systemId) query = query.eq('system_id', systemId);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    // ─── HVAC SPECIFIC ──────────────────────────────────────
    async getHvacStatus(tenantId: string) {
        // Find the HVAC system first
        const { data: system } = await this.db.from('bms_systems')
            .select('id').eq('tenant_id', tenantId).eq('system_type', 'hvac').single();
            
        if (!system) return [];
        
        return this.getEquipment(tenantId, { systemId: system.id });
    }
}
