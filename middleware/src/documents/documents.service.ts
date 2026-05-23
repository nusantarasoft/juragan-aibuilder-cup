import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DocumentsService {
    private sb;
    constructor(private supabase: SupabaseService) { this.sb = this.supabase.getClient(); }

    async getAllDocuments(tenantId: string) { return this.sb.from('documents').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getDocumentVersions(tenantId: string) { return this.sb.from('document_versions').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getDocumentShares(tenantId: string) { return this.sb.from('document_shares').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getDocumentWorkflows(tenantId: string) { return this.sb.from('document_workflows').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
}