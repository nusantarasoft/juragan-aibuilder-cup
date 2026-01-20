import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { RagService } from '../rag/rag.service';
import * as Minio from 'minio';

export interface MediaFile {
    id: string;
    filename: string;
    originalName?: string;
    url: string;
    s3Key?: string;
    mimeType?: string;
    sizeBytes?: number;
    altText?: string;
    uploadedBy?: string;
    embedding?: string;
    createdAt: string;
    updatedAt?: string;
    metadata?: any;
}

export interface S3Object {
    key: string;
    size: number;
    lastModified: string;
    etag?: string;
    isFolder: boolean;
}

export interface S3Bucket {
    name: string;
    creationDate?: string;
}

export interface StorageStats {
    totalFiles: number;
    totalSizeBytes: number;
    buckets: S3Bucket[];
}

export interface CreateMediaInput {
    filename: string;
    originalName?: string;
    url: string;
    s3Key?: string;
    mimeType?: string;
    sizeBytes?: number;
    altText?: string;
}

export interface UpdateMediaInput {
    altText?: string;
    filename?: string;
}

@Injectable()
export class MediaService {
    private readonly logger = new Logger(MediaService.name);
    private minioClient: Minio.Client;

    constructor(
        private readonly supabase: SupabaseService,
        private readonly configService: ConfigService,
        private readonly ragService: RagService
    ) {
        this.initializeMinio();
    }

    private initializeMinio() {
        // Try S3_ prefix first (what Docker provides), then MINIO_ prefix as fallback
        const endpointUrl = this.configService.get('S3_ENDPOINT') || this.configService.get('MINIO_ENDPOINT') || 'http://minio:9000';

        // Parse endpoint URL to extract host and port
        let endPoint = 'minio';
        let port = 9000;
        let useSSL = false;

        try {
            const url = new URL(endpointUrl);
            endPoint = url.hostname;
            port = parseInt(url.port || (url.protocol === 'https:' ? '443' : '9000'), 10);
            useSSL = url.protocol === 'https:';
        } catch {
            // If parsing fails, use defaults
            this.logger.warn(`Failed to parse S3_ENDPOINT: ${endpointUrl}, using defaults`);
        }

        const accessKey = this.configService.get('S3_ACCESS_KEY') || this.configService.get('MINIO_ACCESS_KEY') || 'minioadmin';
        const secretKey = this.configService.get('S3_SECRET_KEY') || this.configService.get('MINIO_SECRET_KEY') || 'minioadmin';

        this.minioClient = new Minio.Client({
            endPoint,
            port,
            useSSL,
            accessKey,
            secretKey,
        });
        this.logger.log(`MinIO Client initialized for ${endPoint}:${port} (SSL: ${useSSL})`);
    }

    // ---------------------------------------------------------
    // DB Operations
    // ---------------------------------------------------------

    async findAll(options?: {
        limit?: number;
        offset?: number;
        mimeType?: string;
    }): Promise<MediaFile[]> {
        let query = this.supabase
            .getAdminClient()
            .from('media')
            .select('*')
            .order('created_at', { ascending: false });

        if (options?.limit) {
            query = query.limit(options.limit);
        }
        if (options?.offset) {
            query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
        }
        if (options?.mimeType) {
            query = query.like('mime_type', `${options.mimeType}%`);
        }

        const { data, error } = await query;

        if (error) {
            this.logger.error('Error fetching media:', error);
            return [];
        }

        return this.mapMediaFiles(data || []);
    }

    async findOne(id: string): Promise<MediaFile | null> {
        const { data, error } = await this.supabase
            .getAdminClient()
            .from('media')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            this.logger.error('Error fetching media:', error);
            return null;
        }

        return this.mapMediaFile(data);
    }

    async create(input: CreateMediaInput): Promise<MediaFile | null> {
        const { data, error } = await this.supabase
            .getAdminClient()
            .from('media')
            .insert({
                filename: input.filename,
                original_name: input.originalName,
                url: input.url,
                s3_key: input.s3Key,
                mime_type: input.mimeType,
                size_bytes: input.sizeBytes,
                alt_text: input.altText,
            })
            .select()
            .single();

        if (error) {
            this.logger.error('Error creating media:', error);
            return null;
        }

        return this.mapMediaFile(data);
    }

    async update(id: string, input: UpdateMediaInput): Promise<MediaFile | null> {
        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (input.altText !== undefined) updates.alt_text = input.altText;
        if (input.filename !== undefined) updates.filename = input.filename;

        const { data, error } = await this.supabase
            .getAdminClient()
            .from('media')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            this.logger.error('Error updating media:', error);
            return null;
        }

        return this.mapMediaFile(data);
    }

    async checkDuplicateMedia(filename: string, folder: string): Promise<{ exists: boolean; id?: string }> {
        // Normalize path
        const prefix = folder.endsWith('/') ? folder : `${folder}/`;
        const s3Key = `${prefix}${filename}`;

        // Check DB first
        const { data } = await this.supabase
            .getAdminClient()
            .from('media')
            .select('id')
            .eq('s3_key', s3Key)
            .single();

        if (data) return { exists: true, id: data.id };

        // Fallback: Check S3 existence (though DB should be source of truth)
        try {
            await this.minioClient.statObject('cms-media', s3Key);
            return { exists: true };
        } catch {
            return { exists: false };
        }
    }

    async delete(id: string): Promise<{ success: boolean; s3Key?: string }> {
        // First get the s3_key for cleanup
        const { data: media } = await this.supabase
            .getAdminClient()
            .from('media')
            .select('s3_key')
            .eq('id', id)
            .single();

        const { error } = await this.supabase
            .getAdminClient()
            .from('media')
            .delete()
            .eq('id', id);

        if (error) {
            this.logger.error('Error deleting media:', error);
            return { success: false };
        }

        // Also try to delete from S3 if key exists
        if (media?.s3_key) {
            try {
                const bucket = 'cms-media'; // helper or config
                await this.minioClient.removeObject(bucket, media.s3_key);
            } catch (e) {
                this.logger.warn(`Failed to delete S3 object ${media.s3_key}`, e);
            }
        }

        return { success: true, s3Key: media?.s3_key };
    }

    // Upload media file via GraphQL (file goes to middleware → MinIO)
    // Updated to handle AI flags
    async uploadMedia(
        file: any, // GraphQL Upload scalar
        options?: {
            folder?: string;
            bucket?: string;
            altText?: string;
            autoLabel?: boolean;
            generateEmbedding?: boolean;
        }
    ): Promise<MediaFile | null> {
        const { createReadStream, filename, mimetype } = await file;
        const stream = createReadStream();
        const folder = options?.folder || 'uploads/';
        const prefix = folder.endsWith('/') ? folder : `${folder}/`;
        const s3Key = `${prefix}${filename}`;
        const bucket = options?.bucket || 'cms-media';

        try {
            // 1. Upload to MinIO
            // Pass size as null/undefined to let MinIO handle stream size (chunked)
            await this.minioClient.putObject(bucket, s3Key, stream, null, {
                'Content-Type': mimetype,
                // 'x-amz-meta-original-name': filename
            });

            // 2. Get file stats for size
            const stats = await this.minioClient.statObject(bucket, s3Key);

            // 3. Create DB Entry
            const { data, error } = await this.supabase
                .getAdminClient()
                .from('media')
                .insert({
                    filename: filename,
                    url: `${await this.getS3Endpoint()}/${bucket}/${s3Key}`,
                    s3_key: s3Key,
                    mime_type: mimetype,
                    size_bytes: stats.size,
                    alt_text: options?.altText || filename,
                })
                .select()
                .single();

            if (error) {
                this.logger.error('Error creating media DB entry:', error);
                return null;
            }

            const mediaFile = this.mapMediaFile(data);

            // 4. Trigger AI Background Tasks
            if (options?.autoLabel) {
                // Non-blocking call
                this.resolveAutoLabel(mediaFile.id);
            }
            if (options?.generateEmbedding) {
                // Non-blocking call
                this.resolveEmbedding(mediaFile.id);
            }

            return mediaFile;

        } catch (e) {
            this.logger.error('Upload failed', e);
            throw e;
        }
    }

    // Helper to resolve circular dependency via ModuleRef or direct call if in same module
    // Since RagService is in another module, we need to inject it or emit an event.
    // simpler approach: We will inject RagService into MediaService (needs forwardRef if circular)
    // or just emit an event. For MVP, assuming RagService is available via ModuleRef
    // But wait, MediaService doesn't have RagService injected.
    // I will add placeholders and user can wire up RagService injection later or I'll do it now.
    // Actually, safest is to let Frontend trigger it OR inject RagService.
    // Let's inject RagService in the constructor. (Requires updating constructor)

    // TEMPORARY: Empty methods to avoid compilation error until RagService injection is added
    private async resolveAutoLabel(id: string) {
        this.logger.log(`Triggering auto-label for ${id}`);
        await this.ragService.autoLabelMedia(id);
    }
    private async resolveEmbedding(id: string) {
        this.logger.log(`Triggering embedding for ${id}`);
        // We need content to embed, normally text. 
        // For images, we might use description/tags. 
        // RagService.generateMediaEmbeddings expects(content: string).
        // If empty, RagService refactor handles fetching title/desc/OCR? 
        // Checking RagService... refactored version fetches data if content is empty.
        await this.ragService.generateMediaEmbeddings(id, '');
    }

    // ---------------------------------------------------------
    // S3 Operations
    // ---------------------------------------------------------

    async listBuckets(): Promise<S3Bucket[]> {
        try {
            const buckets = await this.minioClient.listBuckets();
            return buckets.map(b => ({
                name: b.name,
                creationDate: b.creationDate.toISOString()
            }));
        } catch (e) {
            this.logger.error('listBuckets failed', e);
            return [];
        }
    }

    async listObjects(bucket: string, prefix = '', recursive = false): Promise<S3Object[]> {
        this.logger.log(`Listing objects in bucket: ${bucket}, prefix: ${prefix}, recursive: ${recursive}`);
        return new Promise((resolve, reject) => {
            try {
                const stream = this.minioClient.listObjectsV2(bucket, prefix, recursive);
                const objects: S3Object[] = [];

                stream.on('data', (obj) => {
                    try {
                        const key = obj.name || obj.prefix;
                        if (!key) {
                            this.logger.warn(`Skipping object without name/prefix: ${JSON.stringify(obj)}`);
                            return;
                        }

                        // MinIO returns 'prefix' for folders (if not recursive)
                        // OR 'name' ending in '/' (if recursive or dependent on backend)
                        const isFolder = !!obj.prefix || key.endsWith('/');

                        objects.push({
                            key: key,
                            size: obj.size || 0,
                            lastModified: obj.lastModified ? obj.lastModified.toISOString() : new Date().toISOString(),
                            etag: obj.etag || '',
                            isFolder: isFolder
                        });
                    } catch (e) {
                        this.logger.error(`Error processing object: ${JSON.stringify(obj)}`, e);
                    }
                });

                stream.on('error', (err) => {
                    this.logger.error(`Stream error for bucket ${bucket}`, err);
                    reject(err);
                });
                stream.on('end', () => {
                    this.logger.log(`Finished listing objects for ${bucket}. Found ${objects.length} items.`);
                    resolve(objects);
                });
            } catch (err) {
                this.logger.error(`Synchronous error in listObjects for ${bucket}`, err);
                reject(err);
            }
        });
    }

    async getStorageStats(bucket?: string): Promise<StorageStats> {
        try {
            const buckets = await this.listBuckets();
            let totalFiles = 0;
            let totalSizeBytes = 0;

            // If specific bucket requested, only count that bucket
            const targetBucket = bucket || await this.getDefaultBucket();

            for (const b of buckets) {
                // Only count the specified bucket (or default if not specified)
                if (b.name === targetBucket) {
                    const objs = await this.listObjects(b.name, '', true);
                    // Filter out folder markers (zero-size objects ending with /)
                    const files = objs.filter(o => !o.isFolder && o.size > 0);
                    totalFiles = files.length;
                    totalSizeBytes = files.reduce((acc, curr) => acc + curr.size, 0);
                    break;
                }
            }

            return {
                buckets,
                totalFiles,
                totalSizeBytes
            };
        } catch (e) {
            this.logger.error('getStorageStats failed', e);
            return { buckets: [], totalFiles: 0, totalSizeBytes: 0 };
        }
    }

    // Stub for future
    async getDefaultBucket(): Promise<string> {
        return this.configService.get('NEXT_PUBLIC_S3_BUCKET') || 'cms-media';
    }

    async getS3Endpoint(): Promise<string> {
        return this.configService.get('NEXT_PUBLIC_S3_ENDPOINT') || 'http://127.0.0.1:9000';
    }

    async createBucket(name: string): Promise<boolean> {
        try {
            await this.minioClient.makeBucket(name, 'us-east-1');
            return true;
        } catch (e) {
            this.logger.error('createBucket failed', e);
            return false;
        }
    }

    async deleteBucket(name: string): Promise<boolean> {
        try {
            await this.minioClient.removeBucket(name);
            return true;
        } catch (e) {
            this.logger.error('deleteBucket failed', e);
            return false;
        }
    }

    async createFolder(path: string, bucket?: string): Promise<boolean> {
        try {
            const b = bucket || await this.getDefaultBucket();
            await this.minioClient.putObject(b, path, Buffer.from(''));
            return true;
        } catch (e) {
            this.logger.error('createFolder failed', e);
            return false;
        }
    }

    async deleteFolder(path: string): Promise<boolean> {
        this.logger.warn('deleteFolder not fully implemented');
        return true;
    }

    // Move file - copy then delete source
    async moveFile(
        sourceKey: string,
        destKey: string,
        sourceBucket?: string,
        destBucket?: string
    ): Promise<boolean> {
        try {
            const srcBucket = sourceBucket || await this.getDefaultBucket();
            const dstBucket = destBucket || await this.getDefaultBucket();

            // Use copyObject to copy the file
            const copySource = `/${srcBucket}/${sourceKey}`;
            await this.minioClient.copyObject(dstBucket, destKey, copySource, new Minio.CopyConditions());

            // Delete the original
            await this.minioClient.removeObject(srcBucket, sourceKey);

            this.logger.log(`Moved file from ${srcBucket}/${sourceKey} to ${dstBucket}/${destKey}`);
            return true;
        } catch (e) {
            this.logger.error('moveFile failed', e);
            return false;
        }
    }

    // Copy file to new location
    async copyFile(
        sourceKey: string,
        destKey: string,
        sourceBucket?: string,
        destBucket?: string
    ): Promise<boolean> {
        try {
            const srcBucket = sourceBucket || await this.getDefaultBucket();
            const dstBucket = destBucket || await this.getDefaultBucket();

            // Use copyObject to copy the file
            const copySource = `/${srcBucket}/${sourceKey}`;
            await this.minioClient.copyObject(dstBucket, destKey, copySource, new Minio.CopyConditions());

            this.logger.log(`Copied file from ${srcBucket}/${sourceKey} to ${dstBucket}/${destKey}`);
            return true;
        } catch (e) {
            this.logger.error('copyFile failed', e);
            return false;
        }
    }

    async makeBucketPublic(bucket?: string): Promise<boolean> {
        try {
            const b = bucket || await this.getDefaultBucket();
            const policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": { "AWS": ["*"] },
                        "Action": ["s3:GetBucketLocation", "s3:ListBucket", "s3:GetObject"],
                        "Resource": [`arn:aws:s3:::${b}`, `arn:aws:s3:::${b}/*`]
                    }
                ]
            };
            await this.minioClient.setBucketPolicy(b, JSON.stringify(policy));
            return true;
        } catch (e) {
            this.logger.error('makeBucketPublic failed', e);
            return false;
        }
    }

    async getVersioningStatus(bucket?: string): Promise<string> {
        try {
            const b = bucket || await this.getDefaultBucket();
            const result = await this.minioClient.getBucketVersioning(b);
            // Result is { Status: 'Enabled' | 'Suspended' | undefined }
            return result.Status || 'Suspended';
        } catch (e) {
            this.logger.error('getVersioningStatus failed', e);
            return 'Suspended';
        }
    }

    async enableVersioning(bucket?: string): Promise<boolean> {
        try {
            const b = bucket || await this.getDefaultBucket();
            await this.minioClient.setBucketVersioning(b, { Status: 'Enabled' });
            this.logger.log(`Versioning enabled for bucket: ${b}`);
            return true;
        } catch (e) {
            this.logger.error('enableVersioning failed', e);
            return false;
        }
    }

    async disableVersioning(bucket?: string): Promise<boolean> {
        try {
            const b = bucket || await this.getDefaultBucket();
            await this.minioClient.setBucketVersioning(b, { Status: 'Suspended' });
            this.logger.log(`Versioning suspended for bucket: ${b}`);
            return true;
        } catch (e) {
            this.logger.error('disableVersioning failed', e);
            return false;
        }
    }

    async getLifecycleRules(bucket?: string): Promise<any[]> {
        try {
            const b = bucket || await this.getDefaultBucket();
            const config = await this.minioClient.getBucketLifecycle(b);
            // MinIO returns { rules: [...] } or null
            if (!config || !config.Rule) return [];

            // Map MinIO format to our format
            return (Array.isArray(config.Rule) ? config.Rule : [config.Rule]).map((rule: any) => ({
                id: rule.ID || '',
                prefix: rule.Filter?.Prefix || rule.Prefix || '',
                enabled: rule.Status === 'Enabled',
                expirationDays: rule.Expiration?.Days,
                transitionDays: rule.Transition?.Days,
                transitionStorageClass: rule.Transition?.StorageClass,
            }));
        } catch (e: any) {
            // NoSuchLifecycleConfiguration is not an error, just means no rules
            if (e.code === 'NoSuchLifecycleConfiguration') return [];
            this.logger.error('getLifecycleRules failed', e);
            return [];
        }
    }

    async setLifecycleRules(rules: any[], bucket?: string): Promise<boolean> {
        try {
            const b = bucket || await this.getDefaultBucket();

            if (!rules || rules.length === 0) {
                // Delete lifecycle if no rules
                return this.deleteLifecycleRules(b);
            }

            // Convert our format to MinIO format
            const minioRules = rules.map(rule => {
                const minioRule: any = {
                    ID: rule.id || `rule-${Date.now()}`,
                    Status: rule.enabled ? 'Enabled' : 'Disabled',
                    Filter: { Prefix: rule.prefix || '' },
                };

                if (rule.expirationDays) {
                    minioRule.Expiration = { Days: rule.expirationDays };
                }
                if (rule.transitionDays && rule.transitionStorageClass) {
                    minioRule.Transition = {
                        Days: rule.transitionDays,
                        StorageClass: rule.transitionStorageClass,
                    };
                }

                return minioRule;
            });

            await this.minioClient.setBucketLifecycle(b, { Rule: minioRules });
            this.logger.log(`Lifecycle rules set for bucket: ${b}`);
            return true;
        } catch (e) {
            this.logger.error('setLifecycleRules failed', e);
            return false;
        }
    }

    async deleteLifecycleRules(bucket?: string): Promise<boolean> {
        try {
            const b = bucket || await this.getDefaultBucket();
            await this.minioClient.removeBucketLifecycle(b);
            this.logger.log(`Lifecycle rules deleted for bucket: ${b}`);
            return true;
        } catch (e) {
            this.logger.error('deleteLifecycleRules failed', e);
            return false;
        }
    }

    // Helpers

    private mapMediaFile(data: Record<string, unknown>): MediaFile {
        return {
            id: data.id as string,
            filename: data.filename as string,
            originalName: data.original_name as string | undefined,
            url: data.url as string,
            s3Key: data.s3_key as string | undefined,
            mimeType: data.mime_type as string | undefined,
            sizeBytes: data.size_bytes as number | undefined,
            altText: data.alt_text as string | undefined,
            uploadedBy: data.uploaded_by as string | undefined,
            embedding: data.embedding as string | undefined,
            createdAt: data.created_at as string,
            updatedAt: data.updated_at as string | undefined,
            metadata: data.metadata,
        };
    }

    private mapMediaFiles(data: Record<string, unknown>[]): MediaFile[] {
        return data.map((item) => this.mapMediaFile(item));
    }
}
