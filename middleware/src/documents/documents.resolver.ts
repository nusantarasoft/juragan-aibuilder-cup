import { Resolver, Query, Args, ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { DocumentsService } from './documents.service';

@ObjectType() class DocFolderGql {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() name: string;
    @Field({ nullable: true }) parentId?: string;
    @Field({ nullable: true }) module?: string;
    @Field({ nullable: true }) color?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) createdBy?: string;
    @Field({ nullable: true }) createdAt?: string;
    @Field(() => Int, { nullable: true }) childCount?: number;
    @Field(() => Int, { nullable: true }) fileCount?: number;
}

@ObjectType() class DocFileGql {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field({ nullable: true }) folderId?: string;
    @Field() name: string;
    @Field({ nullable: true }) mimeType?: string;
    @Field(() => Float) sizeBytes: number;
    @Field() storagePath: string;
    @Field(() => Int) currentVersion: number;
    @Field(() => [String]) tags: string[];
    @Field({ nullable: true }) module?: string;
    @Field({ nullable: true }) moduleRefId?: string;
    @Field() status: string;
    @Field({ nullable: true }) lockedBy?: string;
    @Field({ nullable: true }) lockedAt?: string;
    @Field({ nullable: true }) createdBy?: string;
    @Field({ nullable: true }) createdAt?: string;
    @Field({ nullable: true }) updatedAt?: string;
}

@ObjectType() class DocStatsGql {
    @Field(() => Int) totalFiles: number;
    @Field(() => Int) totalFolders: number;
    @Field(() => Float) totalSize: number;
    @Field(() => Int) activeWorkflows: number;
    @Field(() => Int) recentUploads: number;
    @Field(() => Int) sharedFiles: number;
}

@ObjectType() class DocWorkflowGql {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
    @Field(() => GraphQLJSON) steps: any;
    @Field() status: string;
    @Field({ nullable: true }) createdBy?: string;
    @Field({ nullable: true }) createdAt?: string;
}

@ObjectType() class DocTemplateGql {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() name: string;
    @Field() category: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) fileId?: string;
    @Field(() => [String]) tags: string[];
    @Field(() => Int) usageCount: number;
    @Field({ nullable: true }) createdBy?: string;
    @Field({ nullable: true }) createdAt?: string;
}

@ObjectType() class DocWorkflowInstanceGql {
    @Field(() => ID) id: string;
    @Field() workflowId: string;
    @Field() fileId: string;
    @Field(() => Int) currentStep: number;
    @Field() status: string;
    @Field({ nullable: true }) submittedBy?: string;
    @Field({ nullable: true }) completedAt?: string;
    @Field({ nullable: true }) createdAt?: string;
    @Field({ nullable: true }) workflowName?: string;
    @Field({ nullable: true }) fileName?: string;
}

const mapFolder = (r: any): DocFolderGql => ({
    id: r.id, tenantId: r.tenant_id, name: r.name, parentId: r.parent_id,
    module: r.module, color: r.color, description: r.description,
    createdBy: r.created_by, createdAt: r.created_at,
    childCount: r.childCount, fileCount: r.fileCount,
});

const mapFile = (r: any): DocFileGql => ({
    id: r.id, tenantId: r.tenant_id, folderId: r.folder_id, name: r.name,
    mimeType: r.mime_type, sizeBytes: Number(r.size_bytes) || 0,
    storagePath: r.storage_path, currentVersion: r.current_version || 1,
    tags: r.tags || [], module: r.module, moduleRefId: r.module_ref_id,
    status: r.status || 'active', lockedBy: r.locked_by, lockedAt: r.locked_at,
    createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at,
});

@Resolver()
export class DocumentsResolver {
    constructor(private svc: DocumentsService) {}

    @Query(() => GraphQLJSON) async allDocuments(@Args('tenantId') t: string) { return this.svc.getAllDocuments(t); }
    @Query(() => GraphQLJSON) async documentVersions(@Args('tenantId') t: string) { return this.svc.getDocumentVersions(t); }
    @Query(() => GraphQLJSON) async documentShares(@Args('tenantId') t: string) { return this.svc.getDocumentShares(t); }
    @Query(() => GraphQLJSON) async documentWorkflows(@Args('tenantId') t: string) { return this.svc.getDocumentWorkflows(t); }

    @Query(() => [DocFolderGql]) async docFolders(
        @Args('tenantId') tenantId: string,
        @Args('parentId', { nullable: true }) parentId?: string,
    ) {
        return (await this.svc.getFolders(tenantId, parentId)).map(mapFolder);
    }

    @Query(() => [DocFileGql]) async docFiles(
        @Args('tenantId') tenantId: string,
        @Args('folderId', { nullable: true }) folderId?: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('search', { nullable: true }) search?: string,
        @Args('module', { nullable: true }) module?: string,
    ) {
        return (await this.svc.getFiles(tenantId, { folderId, status, search, module })).map(mapFile);
    }

    @Query(() => [DocFileGql]) async docRecentFiles(
        @Args('tenantId') tenantId: string,
        @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit?: number,
    ) {
        return (await this.svc.getRecentFiles(tenantId, limit)).map(mapFile);
    }

    @Query(() => [DocFileGql]) async docSharedFiles(
        @Args('tenantId') tenantId: string,
        @Args('userId', { nullable: true }) userId?: string,
    ) {
        return (await this.svc.getSharedFiles(tenantId, userId)).map(mapFile);
    }

    @Query(() => [DocTemplateGql]) async docTemplates(@Args('tenantId') tenantId: string) {
        return (await this.svc.getTemplates(tenantId)).map((r: any) => ({
            id: r.id, tenantId: r.tenant_id, name: r.name, category: r.category,
            description: r.description, fileId: r.file_id, tags: r.tags || [],
            usageCount: r.usage_count || 0, createdBy: r.created_by, createdAt: r.created_at,
        }));
    }

    @Query(() => [DocWorkflowGql]) async docWorkflows(@Args('tenantId') tenantId: string) {
        return (await this.svc.getWorkflows(tenantId)).map((r: any) => ({
            id: r.id, tenantId: r.tenant_id, name: r.name, description: r.description,
            steps: r.steps || [], status: r.status, createdBy: r.created_by, createdAt: r.created_at,
        }));
    }

    @Query(() => [DocWorkflowInstanceGql]) async docWorkflowInstances(
        @Args('tenantId') tenantId: string,
        @Args('status', { nullable: true }) status?: string,
    ) {
        return (await this.svc.getWorkflowInstances(tenantId, status)).map((r: any) => ({
            id: r.id, workflowId: r.workflow_id, fileId: r.file_id,
            currentStep: r.current_step, status: r.status, submittedBy: r.submitted_by,
            completedAt: r.completed_at, createdAt: r.created_at,
            workflowName: r.workflowName, fileName: r.fileName,
        }));
    }

    @Query(() => DocStatsGql) async docStats(@Args('tenantId') tenantId: string) {
        return this.svc.getStats(tenantId);
    }

    @Query(() => [GraphQLJSON]) async docVersions(@Args('fileId') fileId: string) {
        return this.svc.getFileVersions(fileId);
    }

    @Query(() => [GraphQLJSON]) async docAccess(@Args('fileId') fileId: string) {
        return this.svc.getFileAccess(fileId);
    }

    @Query(() => [GraphQLJSON]) async docAuditLog(@Args('fileId') fileId: string) {
        return this.svc.getFileAuditLog(fileId);
    }
}
