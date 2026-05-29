import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class CollaborationService {
    private sb;
    constructor(private supabase: SupabaseService) { this.sb = this.supabase.getClient(); }

    async getCollaborationChannels(tenantId: string) { return this.sb.from('collaboration_channels').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getCollaborationMessages(tenantId: string) { return this.sb.from('collaboration_messages').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
}