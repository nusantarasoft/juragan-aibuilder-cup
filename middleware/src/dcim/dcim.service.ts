import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DcimService {
    private readonly logger = new Logger(DcimService.name);

    constructor(
        private supabaseService: SupabaseService,
    ) { }

    private get db() {
        return this.supabaseService.getAdminClient();
    }

    // ─── SITES ──────────────────────────────────────────────
    async getSites(tenantId: string) {
        const { data, error } = await this.db.from('dcim_sites').select('*').eq('tenant_id', tenantId).order('name');
        if (error) throw error;
        return data;
    }

    async getSite(id: string) {
        const { data, error } = await this.db.from('dcim_sites').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createSite(tenantId: string, input: any) {
        const { data, error } = await this.db.from('dcim_sites').insert({
            tenant_id: tenantId,
            ...input
        }).select().single();
        if (error) throw error;
        return data;
    }

    // ─── BUILDINGS ──────────────────────────────────────────
    async getBuildings(tenantId: string, siteId?: string) {
        let query = this.db.from('dcim_buildings').select('*').eq('tenant_id', tenantId);
        if (siteId) query = query.eq('site_id', siteId);
        const { data, error } = await query.order('name');
        if (error) throw error;
        return data;
    }

    async createBuilding(tenantId: string, input: any) {
        const { data, error } = await this.db.from('dcim_buildings').insert({ tenant_id: tenantId, ...input }).select().single();
        if (error) throw error;
        return data;
    }

    // ─── ROOMS ──────────────────────────────────────────────
    async getRooms(tenantId: string, buildingId?: string) {
        let query = this.db.from('dcim_rooms').select('*').eq('tenant_id', tenantId);
        if (buildingId) query = query.eq('building_id', buildingId);
        const { data, error } = await query.order('name');
        if (error) throw error;
        return data;
    }

    async createRoom(tenantId: string, input: any) {
        const { data, error } = await this.db.from('dcim_rooms').insert({ tenant_id: tenantId, ...input }).select().single();
        if (error) throw error;
        return data;
    }

    // ─── RACKS ──────────────────────────────────────────────
    async getRacks(tenantId: string, filters?: { roomId?: string, status?: string }) {
        let query = this.db.from('dcim_racks').select('*').eq('tenant_id', tenantId);
        if (filters?.roomId) query = query.eq('room_id', filters.roomId);
        if (filters?.status) query = query.eq('status', filters.status);
        const { data, error } = await query.order('name');
        if (error) throw error;
        return data;
    }

    async getRack(id: string) {
        const { data, error } = await this.db.from('dcim_racks').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createRack(tenantId: string, input: any) {
        const { data, error } = await this.db.from('dcim_racks').insert({ tenant_id: tenantId, ...input }).select().single();
        if (error) throw error;
        return data;
    }

    // ─── DEVICES ────────────────────────────────────────────
    async getDevices(tenantId: string, filters?: { rackId?: string, status?: string }) {
        let query = this.db.from('dcim_devices').select('*').eq('tenant_id', tenantId);
        if (filters?.rackId) query = query.eq('rack_id', filters.rackId);
        if (filters?.status) query = query.eq('status', filters.status);
        const { data, error } = await query.order('name');
        if (error) throw error;
        return data;
    }

    async getDevice(id: string) {
        const { data, error } = await this.db.from('dcim_devices').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createDevice(tenantId: string, input: any) {
        const { data, error } = await this.db.from('dcim_devices').insert({ tenant_id: tenantId, ...input }).select().single();
        if (error) throw error;
        return data;
    }
}
