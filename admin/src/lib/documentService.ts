/**
 * Document Management Service - All operations via GraphQL Middleware
 */

import { DEFAULT_TENANT_ID, gql } from '@/lib/graphql';

// ─── Types ───────────────────────────────────────────────
export interface DocFolder { id: string; tenantId: string; name: string; parentId?: string; module?: string; moduleRefId?: string; color?: string; description?: string; createdBy?: string; createdAt?: string; childCount?: number; fileCount?: number; }
export interface DocFile { id: string; tenantId: string; folderId?: string; name: string; mimeType?: string; sizeBytes: number; storagePath: string; currentVersion: number; tags: string[]; module?: string; moduleRefId?: string; status: string; lockedBy?: string; lockedAt?: string; createdBy?: string; createdAt?: string; updatedAt?: string; }
export interface DocVersion { id: string; fileId: string; versionNumber: number; storagePath: string; sizeBytes: number; changeNotes?: string; uploadedBy?: string; createdAt?: string; }
export interface DocAccess { id: string; fileId: string; userId: string; permission: string; grantedBy?: string; grantedAt?: string; userName?: string; }
export interface DocTemplate { id: string; tenantId: string; name: string; category: string; description?: string; fileId?: string; tags: string[]; usageCount: number; createdBy?: string; createdAt?: string; }
export interface DocWorkflow { id: string; tenantId: string; name: string; description?: string; steps: any[]; status: string; createdBy?: string; createdAt?: string; }
export interface DocWorkflowInstance { id: string; workflowId: string; fileId: string; currentStep: number; status: string; submittedBy?: string; completedAt?: string; createdAt?: string; workflowName?: string; fileName?: string; }
export interface DocAuditEntry { id: string; fileId: string; action: string; userId?: string; metadata?: any; createdAt?: string; fileName?: string; }
export interface DocStats { totalFiles: number; totalFolders: number; totalSize: number; activeWorkflows: number; recentUploads: number; sharedFiles: number; }

// ─── Service ─────────────────────────────────────────────
export const documentService = {
    // ─── Folders ─────────────────────────────────────────
    async getFolders(tenantId: string = DEFAULT_TENANT_ID, parentId?: string): Promise<DocFolder[]> {
        tenantId = tenantId ?? DEFAULT_TENANT_ID;
        const d = await gql<{ docFolders: DocFolder[] }>(`query($t:String!,$p:String){docFolders(tenantId:$t,parentId:$p){id tenantId name parentId module color description createdBy createdAt childCount fileCount}}`, { t: tenantId, p: parentId });
        return d.docFolders || [];
    },
    async createFolder(tenantId = DEFAULT_TENANT_ID, input: Record<string, any>) {
        const d = await gql<{ createDocFolder: DocFolder }>(`mutation($t:String!,$i:DocFolderInput!){createDocFolder(tenantId:$t,input:$i){id name parentId color createdAt}}`, { t: tenantId, i: input });
        return d.createDocFolder;
    },
    async updateFolder(id: string, input: Record<string, any>) {
        const d = await gql<{ updateDocFolder: DocFolder }>(`mutation($id:String!,$i:DocFolderUpdateInput!){updateDocFolder(id:$id,input:$i){id name color}}`, { id, i: input });
        return d.updateDocFolder;
    },
    async deleteFolder(id: string) {
        await gql(`mutation($id:String!){deleteDocFolder(id:$id)}`, { id });
    },

    // ─── Files ──────────────────────────────────────────
    async getFiles(tenantId = DEFAULT_TENANT_ID, filters?: { folderId?: string; status?: string; search?: string; module?: string }): Promise<DocFile[]> {
        const d = await gql<{ docFiles: DocFile[] }>(`query($t:String!,$f:String,$s:String,$q:String,$m:String){docFiles(tenantId:$t,folderId:$f,status:$s,search:$q,module:$m){id tenantId folderId name mimeType sizeBytes storagePath currentVersion tags module moduleRefId status lockedBy lockedAt createdBy createdAt updatedAt}}`, { t: tenantId, f: filters?.folderId, s: filters?.status, q: filters?.search, m: filters?.module });
        return d.docFiles || [];
    },
    async getRecentFiles(tenantId: string = DEFAULT_TENANT_ID, limit = 20): Promise<DocFile[]> {
        tenantId = tenantId ?? DEFAULT_TENANT_ID;
        const d = await gql<{ docRecentFiles: DocFile[] }>(`query($t:String!,$l:Int){docRecentFiles(tenantId:$t,limit:$l){id tenantId folderId name mimeType sizeBytes currentVersion tags status createdBy createdAt updatedAt}}`, { t: tenantId, l: limit });
        return d.docRecentFiles || [];
    },
    async getSharedFiles(tenantId = DEFAULT_TENANT_ID, userId?: string): Promise<DocFile[]> {
        const d = await gql<{ docSharedFiles: DocFile[] }>(`query($t:String!,$u:String){docSharedFiles(tenantId:$t,userId:$u){id tenantId folderId name mimeType sizeBytes currentVersion tags status createdBy createdAt updatedAt}}`, { t: tenantId, u: userId });
        return d.docSharedFiles || [];
    },
    async uploadFile(tenantId = DEFAULT_TENANT_ID, input: Record<string, any>) {
        const d = await gql<{ uploadDocFile: DocFile }>(`mutation($t:String!,$i:DocFileInput!){uploadDocFile(tenantId:$t,input:$i){id name mimeType sizeBytes currentVersion status createdAt}}`, { t: tenantId, i: input });
        return d.uploadDocFile;
    },
    async updateFile(id: string, input: Record<string, any>) {
        const d = await gql<{ updateDocFile: DocFile }>(`mutation($id:String!,$i:DocFileUpdateInput!){updateDocFile(id:$id,input:$i){id name tags status}}`, { id, i: input });
        return d.updateDocFile;
    },
    async deleteFile(id: string) {
        await gql(`mutation($id:String!){deleteDocFile(id:$id)}`, { id });
    },

    // ─── Versions ───────────────────────────────────────
    async getVersions(fileId: string): Promise<DocVersion[]> {
        const d = await gql<{ docVersions: DocVersion[] }>(`query($id:String!){docVersions(fileId:$id){id fileId versionNumber storagePath sizeBytes changeNotes uploadedBy createdAt}}`, { id: fileId });
        return d.docVersions || [];
    },
    async restoreVersion(fileId: string, versionNumber: number) {
        await gql(`mutation($f:String!,$v:Int!){restoreDocVersion(fileId:$f,versionNumber:$v)}`, { f: fileId, v: versionNumber });
    },

    // ─── Access Control ─────────────────────────────────
    async getAccess(fileId: string): Promise<DocAccess[]> {
        const d = await gql<{ docAccess: DocAccess[] }>(`query($id:String!){docAccess(fileId:$id){id fileId userId permission grantedBy grantedAt userName}}`, { id: fileId });
        return d.docAccess || [];
    },
    async grantAccess(fileId: string, userId: string, permission: string) {
        await gql(`mutation($f:String!,$u:String!,$p:String!){grantDocAccess(fileId:$f,userId:$u,permission:$p)}`, { f: fileId, u: userId, p: permission });
    },
    async revokeAccess(fileId: string, userId: string) {
        await gql(`mutation($f:String!,$u:String!){revokeDocAccess(fileId:$f,userId:$u)}`, { f: fileId, u: userId });
    },

    // ─── Templates ──────────────────────────────────────
    async getTemplates(tenantId = DEFAULT_TENANT_ID): Promise<DocTemplate[]> {
        const d = await gql<{ docTemplates: DocTemplate[] }>(`query($t:String!){docTemplates(tenantId:$t){id tenantId name category description fileId tags usageCount createdBy createdAt}}`, { t: tenantId });
        return d.docTemplates || [];
    },
    async createTemplate(tenantId = DEFAULT_TENANT_ID, input: Record<string, any>) {
        const d = await gql<{ createDocTemplate: DocTemplate }>(`mutation($t:String!,$i:DocTemplateInput!){createDocTemplate(tenantId:$t,input:$i){id name category createdAt}}`, { t: tenantId, i: input });
        return d.createDocTemplate;
    },
    async deleteTemplate(id: string) {
        await gql(`mutation($id:String!){deleteDocTemplate(id:$id)}`, { id });
    },

    // ─── Workflows ──────────────────────────────────────
    async getWorkflows(tenantId = DEFAULT_TENANT_ID): Promise<DocWorkflow[]> {
        const d = await gql<{ docWorkflows: DocWorkflow[] }>(`query($t:String!){docWorkflows(tenantId:$t){id tenantId name description steps status createdBy createdAt}}`, { t: tenantId });
        return d.docWorkflows || [];
    },
    async createWorkflow(tenantId = DEFAULT_TENANT_ID, input: Record<string, any>) {
        const d = await gql<{ createDocWorkflow: DocWorkflow }>(`mutation($t:String!,$i:DocWorkflowInput!){createDocWorkflow(tenantId:$t,input:$i){id name status createdAt}}`, { t: tenantId, i: input });
        return d.createDocWorkflow;
    },
    async getWorkflowInstances(tenantId = DEFAULT_TENANT_ID, filters?: { status?: string }): Promise<DocWorkflowInstance[]> {
        const d = await gql<{ docWorkflowInstances: DocWorkflowInstance[] }>(`query($t:String!,$s:String){docWorkflowInstances(tenantId:$t,status:$s){id workflowId fileId currentStep status submittedBy completedAt createdAt workflowName fileName}}`, { t: tenantId, s: filters?.status });
        return d.docWorkflowInstances || [];
    },
    async submitForApproval(fileId: string, workflowId: string) {
        await gql(`mutation($f:String!,$w:String!){submitDocForApproval(fileId:$f,workflowId:$w)}`, { f: fileId, w: workflowId });
    },
    async approveWorkflowStep(instanceId: string) {
        await gql(`mutation($id:String!){approveDocWorkflowStep(id:$id)}`, { id: instanceId });
    },
    async rejectWorkflowStep(instanceId: string, reason?: string) {
        await gql(`mutation($id:String!,$r:String){rejectDocWorkflowStep(id:$id,reason:$r)}`, { id: instanceId, r: reason });
    },

    // ─── Audit Log ──────────────────────────────────────
    async getAuditLog(fileId: string): Promise<DocAuditEntry[]> {
        const d = await gql<{ docAuditLog: DocAuditEntry[] }>(`query($id:String!){docAuditLog(fileId:$id){id fileId action userId metadata createdAt}}`, { id: fileId });
        return d.docAuditLog || [];
    },

    // ─── Stats ──────────────────────────────────────────
    async getStats(tenantId = DEFAULT_TENANT_ID): Promise<DocStats> {
        const d = await gql<{ docStats: DocStats }>(`query($t:String!){docStats(tenantId:$t){totalFiles totalFolders totalSize activeWorkflows recentUploads sharedFiles}}`, { t: tenantId });
        return d.docStats || { totalFiles: 0, totalFolders: 0, totalSize: 0, activeWorkflows: 0, recentUploads: 0, sharedFiles: 0 };
    },
};
