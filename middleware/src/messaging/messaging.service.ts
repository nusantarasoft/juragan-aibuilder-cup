import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class MessagingService {
    private sb;
    constructor(private supabase: SupabaseService) { this.sb = this.supabase.getClient(); }

    async getMessagingTopics(tenantId: string) { return this.sb.from('messaging_topics').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getMessagingQueues(tenantId: string) { return this.sb.from('messaging_queues').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getMessagingEvents(tenantId: string) { return this.sb.from('messaging_events').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
}