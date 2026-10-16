import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DocumentsService {
    private sb;
    constructor(private supabase: SupabaseService) {
        this.sb = this.supabase.getAdminClient();
    }

    async getFolders(tenantId: string, parentId?: string) {
        let q = this.sb.from('doc_folders').select('*').eq('tenant_id', tenantId).order('name');
        if (parentId) q = q.eq('parent_id', parentId);
        else q = q.is('parent_id', null);
        const { data, error } = await q;
        if (error) throw error;
        const folders = data || [];
        const withCounts = await Promise.all(folders.map(async (f: any) => {
            const [{ count: fileCount }, { count: childCount }] = await Promise.all([
                this.sb.from('doc_files').select('id', { count: 'exact', head: true }).eq('folder_id', f.id),
                this.sb.from('doc_folders').select('id', { count: 'exact', head: true }).eq('parent_id', f.id),
            ]);
            return { ...f, fileCount: fileCount || 0, childCount: childCount || 0 };
        }));
        return withCounts;
    }

    async getFiles(tenantId: string, filters?: { folderId?: string; status?: string; search?: string; module?: string }) {
        let q = this.sb.from('doc_files').select('*').eq('tenant_id', tenantId).order('updated_at', { ascending: false });
        if (filters?.folderId) q = q.eq('folder_id', filters.folderId);
        if (filters?.status) q = q.eq('status', filters.status);
        if (filters?.module) q = q.eq('module', filters.module);
        if (filters?.search) q = q.ilike('name', `%${filters.search}%`);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
    }

    async getRecentFiles(tenantId: string, limit = 20) {
        const { data, error } = await this.sb.from('doc_files').select('*').eq('tenant_id', tenantId)
            .order('created_at', { ascending: false }).limit(limit);
        if (error) throw error;
        return data || [];
    }

    async getSharedFiles(tenantId: string, _userId?: string) {
        const { data, error } = await this.sb.from('doc_access')
            .select('file_id, doc_files(*)').eq('doc_files.tenant_id', tenantId);
        if (error) {
            const { data: files } = await this.sb.from('doc_files').select('*').eq('tenant_id', tenantId).limit(50);
            return files || [];
        }
        return (data || []).map((r: any) => r.doc_files).filter(Boolean);
    }

    async getTemplates(tenantId: string) {
        const { data, error } = await this.sb.from('doc_templates').select('*').eq('tenant_id', tenantId).order('name');
        if (error) throw error;
        return data || [];
    }

    async getWorkflows(tenantId: string) {
        const { data, error } = await this.sb.from('doc_workflows').select('*').eq('tenant_id', tenantId).order('name');
        if (error) throw error;
        return data || [];
    }

    async getWorkflowInstances(tenantId: string, status?: string) {
        let q = this.sb.from('doc_workflow_instances')
            .select('*, doc_workflows(name), doc_files(name)').eq('doc_files.tenant_id', tenantId);
        if (status) q = q.eq('status', status);
        const { data, error } = await q;
        if (error) return [];
        return (data || []).map((r: any) => ({
            ...r,
            workflowName: r.doc_workflows?.name,
            fileName: r.doc_files?.name,
        }));
    }

    async getStats(tenantId: string) {
        const [files, folders, workflows, recent] = await Promise.all([
            this.sb.from('doc_files').select('size_bytes', { count: 'exact' }).eq('tenant_id', tenantId).eq('status', 'active'),
            this.sb.from('doc_folders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
            this.sb.from('doc_workflows').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'active'),
            this.sb.from('doc_files').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId)
                .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        ]);
        const totalSize = (files.data || []).reduce((s: number, f: any) => s + (Number(f.size_bytes) || 0), 0);
        return {
            totalFiles: files.count || 0,
            totalFolders: folders.count || 0,
            totalSize,
            activeWorkflows: workflows.count || 0,
            recentUploads: recent.count || 0,
            sharedFiles: 0,
        };
    }

    // Legacy JSON API (unchanged table names)
    async getAllDocuments(tenantId: string) { return this.sb.from('documents').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getDocumentVersions(tenantId: string) { return this.sb.from('document_versions').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getDocumentShares(tenantId: string) { return this.sb.from('document_shares').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getDocumentWorkflows(tenantId: string) { return this.sb.from('document_workflows').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }

    async getFileVersions(fileId: string) {
        const { data, error } = await this.sb.from('doc_versions').select('*').eq('file_id', fileId).order('version_number');
        if (error) throw error;
        return data || [];
    }

    async getFileAccess(fileId: string) {
        const { data, error } = await this.sb.from('doc_access').select('*').eq('file_id', fileId);
        if (error) throw error;
        return data || [];
    }

    async getFileAuditLog(fileId: string) {
        const { data, error } = await this.sb.from('doc_audit_log').select('*').eq('file_id', fileId).order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }
}
