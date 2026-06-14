import { Injectable, Logger, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { RagService } from '../rag/rag.service';
import * as Minio from 'minio';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PassThrough } from 'stream';
import * as sharp from 'sharp';
import * as ffmpeg from 'fluent-ffmpeg';
import { fromPath } from 'pdf2pic';
import { Buffer } from 'buffer';

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
    bucketName?: string;
    checksum?: string;
    thumbnailPath?: string;
    thumbnailUrl?: string; // Signed URL for frontend
    previewPages?: string[]; // JSON array of page image paths
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
    isPublic?: boolean;
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
    description?: string;
}

@Injectable()
export class MediaService implements OnModuleInit {
    private readonly logger = new Logger(MediaService.name);
    private minioClient: Minio.Client;
    private signerClient: Minio.Client;
    private readonly SYSTEM_BUCKET_NAME = 'ns-system';
    private readonly SYSTEM_FOLDERS = ['_thumbnails', '_avatars', '_system', '_temp'];

    constructor(
        private readonly configService: ConfigService,
        private readonly supabase: SupabaseService,
        @Inject(forwardRef(() => RagService))
        private readonly ragService: RagService,
    ) {
        const endPointRaw = this.configService.get('S3_ENDPOINT') || 'minio';
        let useSSL = this.configService.get('S3_USE_SSL') === 'true';

        let endpointUrl = endPointRaw;
        let port = parseInt(String(this.configService.get('S3_PORT') || ''), 10);
        if (Number.isNaN(port) || port <= 0) {
            port = 9000;
        }

        // Match StudioService: if S3_ENDPOINT is a full URL, take hostname + port from it
        if (endPointRaw.includes('://')) {
            try {
                const url = new URL(endPointRaw);
                endpointUrl = url.hostname;
                if (url.port) {
                    port = parseInt(url.port, 10);
                }
                useSSL = url.protocol === 'https:';
                this.logger.log(`Parsed S3 Endpoint: ${endpointUrl}:${port}`);
            } catch (e) {
                this.logger.warn(`Failed to parse S3_ENDPOINT: ${endPointRaw}, using defaults`);
            }
        }

        const accessKey = this.configService.get('S3_ACCESS_KEY') || this.configService.get('MINIO_ACCESS_KEY') || 'minioadmin';
        const secretKey = this.configService.get('S3_SECRET_KEY') || this.configService.get('MINIO_SECRET_KEY') || 'minioadmin';

        this.minioClient = new Minio.Client({
            endPoint: endpointUrl, // Use parsed hostname
            port,
            useSSL,
            accessKey,
            secretKey,
        });
        this.logger.log(`MinIO Client initialized for ${endpointUrl}:${port} (SSL: ${useSSL})`);

        // Initialize Signer Client for Browser URLs (localhost)
        this.signerClient = new Minio.Client({
            endPoint: 'localhost',
            port: 9000,
            useSSL: false,
            accessKey: accessKey,
            secretKey: secretKey,
        });
    }

    async onModuleInit() {
        console.log('[[MEDIA SERVICE]] Module Init Triggered');
        this.ensureSystemBuckets().catch(e => console.error('Failed to ensure system buckets', e));
        setTimeout(() => {
            console.log('[[MEDIA SERVICE]] calling regenerateMissingThumbnails');
            this.regenerateMissingThumbnails();
        }, 2000);
    }



    public async regenerateMissingThumbnails() {
        console.log('[[MEDIA SERVICE]] Checking for missing thumbnails (Deep Check)...');

        // 1. Fetch ALL images AND PDFs from DB
        const { data: mediaFiles, error } = await this.supabase
            .getAdminClient()
            .from('media')
            .select('*')
            .or('mime_type.like.image%,mime_type.eq.application/pdf');

        if (error || !mediaFiles) {
            console.error('[[MEDIA SERVICE]] Failed to fetch media', error);
            return;
        }

        // 2. List existing thumbnails in MinIO to find "ghost" entries
        const existingThumbs = new Set<string>();
        try {
            const stream = this.minioClient.listObjects(this.SYSTEM_BUCKET_NAME, '_thumbnails/', true);
            for await (const obj of stream) {
                if (obj.name) existingThumbs.add(obj.name);
            }
        } catch (e) {
            console.error('[[MEDIA SERVICE]] Failed to list thumbnails from MinIO', e);
        }

        console.log(`[[MEDIA SERVICE]] MinIO has ${existingThumbs.size} thumbnails. DB has ${mediaFiles.length} images.`);

        let regenCount = 0;
        for (const media of mediaFiles) {
            let needsRegen = false;
            // DEBUG LOG:
            if (media.mimeType === 'application/pdf') {
                this.logger.log(`[Regen Check] PDF Found: ${media.filename}, Metadata: ${JSON.stringify(media.metadata)}, ThumbPath: ${media.thumbnailPath}`);
            }

            // Case A: DB has no path -> Needs regen
            if (!media.thumbnail_path || media.thumbnail_path === '') {
                needsRegen = true;
            }
            // Case B: DB has path, but file missing in MinIO -> Needs regen (Ghost)
            else if (!existingThumbs.has(media.thumbnail_path)) {
                needsRegen = true;
                this.logger.log(`[[MEDIA SERVICE]] Ghost thumbnail found for ${media.filename} (Path: ${media.thumbnail_path})`);
            }
            // Case C: PDF but no previewPages -> Needs regen
            else if (media.mime_type === 'application/pdf' && (!media.metadata?.previewPages || media.metadata.previewPages.length === 0)) {
                needsRegen = true;
                this.logger.log(`[[MEDIA SERVICE]] PDF missing preview pages: ${media.filename}`);
            }

            if (needsRegen) {
                regenCount++;
                console.log(`[[MEDIA SERVICE]] Regenerating for ${media.filename} (${media.id})`);
                const MediaObj = await this.mapMediaFile(media);

                // Throttle to avoid crashing
                await this.generateThumbnail(MediaObj).catch(e =>
                    console.error(`[[MEDIA SERVICE]] Failed ${media.filename}`, e)
                );
            }
        }
        console.log(`[[MEDIA SERVICE]] Deep check done. Regenerated ${regenCount} thumbnails.`);
    }

    private async ensureSystemBuckets() {
        try {
            const exists = await this.minioClient.bucketExists(this.SYSTEM_BUCKET_NAME);
            if (!exists) {
                this.logger.log(`Creating system bucket: ${this.SYSTEM_BUCKET_NAME}`);
                await this.minioClient.makeBucket(this.SYSTEM_BUCKET_NAME);
            }

            // Always enforce public policy (idempotent)
            const policy = {
                Version: '2012-10-17',
                Statement: [
                    {
                        Action: ['s3:GetObject'],
                        Effect: 'Allow',
                        Principal: '*',
                        Resource: [`arn:aws:s3:::${this.SYSTEM_BUCKET_NAME}/*`],
                    },
                ],
            };
            await this.minioClient.setBucketPolicy(this.SYSTEM_BUCKET_NAME, JSON.stringify(policy)).catch(e => {
                this.logger.warn(`Failed to set policy for ${this.SYSTEM_BUCKET_NAME}`, e);
            });

            // Enable Versioning
            await this.minioClient.setBucketVersioning(this.SYSTEM_BUCKET_NAME, { Status: 'Enabled' }).catch(e => {
                this.logger.warn(`Failed to enable versioning for ${this.SYSTEM_BUCKET_NAME}`, e);
            });

            // Create placeholder for folders
            for (const folder of this.SYSTEM_FOLDERS) {
                const folderPath = folder.endsWith('/') ? folder : `${folder}/`;
                const keeperFile = `${folderPath}.keep`;
                const exists = await this.minioClient.statObject(this.SYSTEM_BUCKET_NAME, keeperFile).catch(() => null);
                if (!exists) {
                    await this.minioClient.putObject(this.SYSTEM_BUCKET_NAME, keeperFile, Buffer.from(''));
                }
            }
        } catch (e) {
            this.logger.error('Error in ensureSystemBuckets', e);
        }
    }

    // ---------------------------------------------------------
    // DB Operations
    // ---------------------------------------------------------

    async findAll(options?: {
        limit?: number;
        offset?: number;
        mimeType?: string;
        bucket?: string;
        folder?: string;
    }): Promise<MediaFile[]> {
        // SPECIAL HANDLING: System Bucket (Live S3 View)
        if (options?.bucket === this.SYSTEM_BUCKET_NAME) {
            try {
                const prefix = options.folder ? (options.folder.endsWith('/') ? options.folder : `${options.folder}/`) : '';
                // Use listObjects without recursive to emulate standard file explorer within a folder
                // However, our frontend might expect "everything in this folder".
                // Let's use listObjectsV2 with '/' delimiter to simulate folders if needed?
                // actually the Frontend handles folders via `listFolders`. `getMedia` is usually for FILES.
                // So we want all *files* in the current prefix, non-recursive.

                const stream = this.minioClient.listObjectsV2(options.bucket, prefix, false);
                const s3Objects: any[] = [];

                await new Promise((resolve, reject) => {
                    stream.on('data', (obj) => {
                        // Check if it's a file (not a folder logic usually handled by trailing slash or size/etag)
                        // Minio listing returns objects.
                        if (obj.name && !obj.name.endsWith('/')) {
                            s3Objects.push(obj);
                        }
                    });
                    stream.on('error', reject);
                    stream.on('end', resolve);
                });

                // Map S3 Objects to MediaFile schema
                const mediaFiles: Promise<MediaFile>[] = s3Objects.map(async obj => {
                    const key = obj.name;
                    const filename = key.split('/').pop() || key;
                    const url = await this.getPresignedUrl(options.bucket!, key);

                    // Guess Mime (Basic)
                    const ext = filename.split('.').pop()?.toLowerCase();
                    let mimeType = 'application/octet-stream';
                    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) mimeType = `image/${ext}`;
                    else if (['pdf'].includes(ext)) mimeType = 'application/pdf';
                    else if (['mp4', 'webm'].includes(ext)) mimeType = `video/${ext}`;

                    return {
                        id: key, // Use key as ID for system files
                        filename: filename,
                        url: url,
                        bucketName: options.bucket,
                        s3Key: key,
                        mimeType: mimeType,
                        sizeBytes: obj.size,
                        createdAt: obj.lastModified.toISOString(),
                        updatedAt: obj.lastModified.toISOString(),
                        thumbnailUrl: mimeType.startsWith('image/') ? url : undefined // Use same URL for thumb if image
                    };
                });

                return Promise.all(mediaFiles);
            } catch (e) {
                this.logger.error(`S3 List failed for ${options.bucket}`, e);
                return [];
            }
        }

        // STANDARD: Database Query
        let query = this.supabase
            .getAdminClient()
            .from('media')
            .select('*, media_embeddings(embedding)')
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
        if (options?.bucket) {
            query = query.eq('bucket_name', options.bucket);
        }
        if (options?.folder !== undefined) {
            const prefix = options.folder ? (options.folder.endsWith('/') ? options.folder : `${options.folder}/`) : '';
            if (prefix) {
                // For standard media, we might just match the prefix.
                // Ideally we should match exact folder parent, but recursive is safer for now to find things.
                query = query.like('s3_key', `${prefix}%`);
            }
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
            .select('*, media_embeddings(embedding)')
            .eq('id', id)
            .single();

        if (error) {
            this.logger.error('Error fetching media by id:', error);
            return null;
        }

        return await this.mapMediaFile(data);
    }

    async findByS3Key(key: string): Promise<MediaFile | null> {
        const { data, error } = await this.supabase
            .getAdminClient()
            .from('media')
            .select('*, media_embeddings(embedding)')
            .eq('s3_key', key)
            .single();

        if (error) {
            this.logger.error(`Error fetching media by S3 key ${key}:`, error);
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

        return await this.mapMediaFile(data);
    }

    async update(id: string, input: UpdateMediaInput): Promise<MediaFile | null> {
        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (input.altText !== undefined) updates.alt_text = input.altText;
        if (input.filename !== undefined) updates.filename = input.filename;

        if (input.description !== undefined) {
            const { data: existingMedia } = await this.supabase
                .getAdminClient()
                .from('media')
                .select('metadata')
                .eq('id', id)
                .single();

            updates.metadata = {
                ...(existingMedia?.metadata || {}),
                description: input.description,
            };
        }

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

        return await this.mapMediaFile(data);
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
        // First get the s3_key, bucket, and thumbnail_path for cleanup
        const { data: media } = await this.supabase
            .getAdminClient()
            .from('media')
            .select('s3_key, bucket_name, thumbnail_path')
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
                // Use correct bucket or default
                const bucket = media.bucket_name || await this.getDefaultBucket();
                await this.minioClient.removeObject(bucket, media.s3_key);

                // Cleanup Generated Artifacts in ns-system

                // 1. Thumbnail (Robust cleanup via DB record)
                if (media.thumbnail_path) {
                    await this.minioClient.removeObject(this.SYSTEM_BUCKET_NAME, media.thumbnail_path).catch((e) => {
                        this.logger.warn(`Failed to delete thumbnail ${media.thumbnail_path}`, e);
                    });
                }

                // Fallback: Try legacy/fallback paths just in case (e.g. PDF specific ID-based)
                const diffKey = `_thumbnails/${id}.png`;
                await this.minioClient.removeObject(this.SYSTEM_BUCKET_NAME, diffKey).catch(() => { });

                // 2. Previews (Folder)
                // List objects with prefix _previews/<id>/ and delete them
                const previewPrefix = `_previews/${id}/`;
                const previewStream = this.minioClient.listObjects(this.SYSTEM_BUCKET_NAME, previewPrefix, true);
                const previewObjects: string[] = [];

                for await (const obj of previewStream) {
                    if (obj.name) previewObjects.push(obj.name);
                }

                if (previewObjects.length > 0) {
                    await this.minioClient.removeObjects(this.SYSTEM_BUCKET_NAME, previewObjects);
                }

            } catch (e) {
                this.logger.warn(`Failed to delete S3 object ${media.s3_key}`, e);
            }
        }

        return { success: true, s3Key: media?.s3_key };
    }

    // Upload media file via GraphQL (file goes to middleware -> MinIO)
    // Updated to handle Smart Duplicate Handling (Checksum & Auto-Rename)
    async uploadMedia(
        file: any, // GraphQL Upload scalar
        options?: {
            folder?: string;
            bucket?: string;
            altText?: string;
            autoLabel?: boolean;
            generateEmbedding?: boolean;
            onConflict?: 'RENAME' | 'OVERWRITE' | 'ERROR';
        }
    ): Promise<MediaFile | null> {
        const { createReadStream, filename, mimetype } = await file;
        const bucket = options?.bucket || 'cms-media';
        const folder = options?.folder || '';
        const prefix = folder ? (folder.endsWith('/') ? folder : `${folder}/`) : '';

        // 1. Buffer to Temp File to calculate Checksum
        const tempDir = os.tmpdir();
        const tempPath = path.join(tempDir, `upload-${Date.now()}-${filename}`);
        const writeStream = fs.createWriteStream(tempPath);
        const hash = crypto.createHash('sha256');
        const stream = createReadStream();

        try {
            await new Promise<void>((resolve, reject) => {
                stream.on('error', reject);
                writeStream.on('error', reject);

                stream.pipe(hash);
                stream.pipe(writeStream);

                writeStream.on('finish', () => resolve());
            });

            const checksum = hash.digest('hex');
            this.logger.log(`File buffered: ${filename}, SHA256: ${checksum}`);

            // 2. CHECK: Duplicate Content (Same Checksum in SAME FOLDER)
            // Query DB for checksum + bucket (get all matches to check folder)
            const { data: duplicateCandidates } = await this.supabase
                .getAdminClient()
                .from('media')
                .select('id, filename, s3_key')
                .eq('bucket_name', bucket)
                .eq('checksum', checksum);

            if (duplicateCandidates && duplicateCandidates.length > 0) {
                // strict check: collision only if in the exact same folder
                const collision = duplicateCandidates.find(candidate => {
                    // Extract folder from s3_key
                    const lastSlashIndex = candidate.s3_key.lastIndexOf('/');
                    const candidateFolder = lastSlashIndex !== -1 ? candidate.s3_key.substring(0, lastSlashIndex) : '';

                    // Compare with target folder (normalized: no trailing slash)
                    const targetFolderRaw = folder.endsWith('/') ? folder.slice(0, -1) : folder;

                    return candidateFolder === targetFolderRaw;
                });

                if (collision) {
                    this.logger.warn(`Duplicate content detected in same folder: ${filename} matches ${collision.filename}`);
                    throw new Error(`Duplicate file detected: Identical content already exists in this folder as '${collision.filename}'`);
                }
            }

            // 3. CHECK: Duplicate Name (Same Name in Same Folder)
            // Strategy: RENAME | OVERWRITE | ERROR (default)
            let finalFilename = filename;
            let finalS3Key = `${prefix}${finalFilename}`;
            let counter = 1;
            const conflictStrategy = options?.onConflict || 'ERROR';

            if (conflictStrategy === 'OVERWRITE') {
                // Skip name check, allow overwrite (S3 versioning handles history)
                this.logger.log(`Overwrite allowed for ${filename} (onConflict: OVERWRITE)`);
            } else {
                // Check if name exists
                while (true) {
                    const { data: existingName } = await this.supabase
                        .getAdminClient()
                        .from('media')
                        .select('id')
                        .eq('s3_key', finalS3Key)
                        .eq('bucket_name', bucket)
                        .maybeSingle();

                    if (!existingName) break; // Name is free

                    // Collision Detected
                    if (conflictStrategy === 'RENAME') {
                        // Conflict -> Auto-Rename
                        const ext = path.extname(filename);
                        const name = path.basename(filename, ext);
                        finalFilename = `${name}-${counter}${ext}`;
                        finalS3Key = `${prefix}${finalFilename}`;
                        counter++;
                    } else {
                        // Conflict -> Error (Default)
                        throw new Error(`ConflictError: File '${finalFilename}' already exists under '${folder}'.`);
                    }
                }
            }

            if (finalFilename !== filename) {
                this.logger.log(`Auto-renamed '${filename}' to '${finalFilename}'`);
            }

            // 4. Upload to MinIO
            // Use fPutObject since we have the file on disk
            await this.minioClient.fPutObject(bucket, finalS3Key, tempPath, {
                'Content-Type': mimetype,
            });

            // 5. Get file stats
            const stats = fs.statSync(tempPath);

            // 6. Create DB Entry
            const { data, error } = await this.supabase
                .getAdminClient()
                .from('media')
                .insert({
                    filename: finalFilename, // Use final/renamed filename
                    url: `${await this.getS3Endpoint()}/${bucket}/${finalS3Key}`,
                    s3_key: finalS3Key,
                    mime_type: mimetype,
                    size_bytes: stats.size,
                    alt_text: options?.altText || filename,
                    bucket_name: bucket,
                    checksum: checksum,
                })
                .select()
                .single();

            if (error) {
                this.logger.error('Error creating media DB entry:', error);
                // Try to cleanup S3 if DB failed? For now keep it simple.
                return null;
            }

            const mediaFile = await this.mapMediaFile(data);

            // 7. Trigger Background Tasks (AI & Thumbnails)
            this.processBackgroundTasks(mediaFile, options);

            if (options?.generateEmbedding) {
                // Non-blocking call
                this.resolveEmbedding(mediaFile.id);
            }

            return mediaFile;

        } catch (e) {
            this.logger.error('Upload failed', e);
            throw e;
        } finally {
            // Cleanup Temp File
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
        }
    }

    async getPresignedUrl(bucket: string, key: string, expiry: number = 24 * 60 * 60): Promise<string> {
        // Optimization: For public system bucket, return direct URL to avoid signature issues
        // BUT for PDF previews we might want signed URLs if we are debugging signature issues.
        // Actually public bucket allows direct access without signature.
        if (bucket === this.SYSTEM_BUCKET_NAME) {
            return `http://localhost:9000/${bucket}/${key}`;
        }



        try {
            this.logger.log(`[getPresignedUrl] Input -> Bucket: "${bucket}", Key: "${key}"`);

            // Sanitize key: If key includes bucket name prefix, strip it.
            // This prevents "b-01/b-01/file.pdf" errors if S3 key is stored with bucket prefix.
            let cleanKey = key;
            if (cleanKey.startsWith(bucket + '/')) {
                cleanKey = cleanKey.substring(bucket.length + 1);
                this.logger.log(`[getPresignedUrl] Sanitized Key: "${cleanKey}"`);
            } else {
                this.logger.log(`[getPresignedUrl] Key "${key}" did not start with "${bucket}/"`);
            }

            // Use signerClient to generate URL with 'localhost' host (matching browser request)
            const url = await this.signerClient.presignedGetObject(bucket, cleanKey, expiry);
            this.logger.log(`[getPresignedUrl] Generated URL: ${url}`);
            return url;
        } catch (e) {
            this.logger.warn(`Failed to generate presigned URL for ${bucket}/${key}`, e);
            return '';
        }
    }


    private async mapMediaFile(row: any): Promise<MediaFile> {
        // DEBUG: Trace embedding mapping
        if (row.media_embeddings) {
            const eVal = Array.isArray(row.media_embeddings) ? row.media_embeddings[0] : row.media_embeddings;
            this.logger.log(`[Mapper] Media ${row.id} has embeddings: ${!!eVal} (Type: ${typeof eVal?.embedding})`);
        }

        let thumbnailUrl = '';
        if (row.thumbnail_path) {
            // Thumbnails are now stored in the SYSTEM bucket
            thumbnailUrl = await this.getPresignedUrl(this.SYSTEM_BUCKET_NAME, row.thumbnail_path);
        }

        // Map preview pages if they exist
        const previewPages: string[] = [];
        if (row.metadata?.previewPages && Array.isArray(row.metadata.previewPages)) {
            for (const path of row.metadata.previewPages) {
                const url = await this.getPresignedUrl(this.SYSTEM_BUCKET_NAME, path);
                if (url) previewPages.push(url);
            }
        }

        // Always presign the main URL to ensure it works in browser (fixes broken image preview)
        // Internal URL (minio:9000) is not accessible, and non-public buckets reject unsigned requests.
        const signedUrl = await this.getPresignedUrl(row.bucket_name, row.s3_key);

        // Infer bucket from row.bucket_name (if exists) OR s3_key prefix
        let bucket = row.bucket_name;
        if (!bucket && row.s3_key && row.s3_key.includes('/')) {
            const parts = row.s3_key.split('/');
            if (parts.length > 1) {
                bucket = parts[0];
            }
        }
        if (!bucket) bucket = await this.getDefaultBucket();

        return {
            id: row.id,
            filename: row.filename,
            originalName: row.original_name,
            url: signedUrl || row.url, // Prefer signed URL for access
            s3Key: row.s3_key,
            mimeType: row.mime_type,
            sizeBytes: row.size_bytes,
            altText: row.alt_text,
            uploadedBy: row.uploaded_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            metadata: row.metadata || {},
            bucketName: bucket,
            checksum: row.checksum,
            thumbnailPath: row.thumbnail_path,
            thumbnailUrl: thumbnailUrl,
            previewPages: previewPages,
            embedding: (row.media_embeddings) ?
                (() => {
                    const e = Array.isArray(row.media_embeddings) ?
                        (row.media_embeddings[0]?.embedding) : row.media_embeddings?.embedding;
                    if (!e) return undefined;
                    return typeof e === 'string' ? e : JSON.stringify(e);
                })()
                : undefined,
        } as any;
    }

    private mapMediaFiles(rows: any[]): Promise<MediaFile[]> {
        return Promise.all(rows.map(r => this.mapMediaFile(r)));
    }

    private processBackgroundTasks(media: MediaFile, options?: any) {
        // Thumbnail Generation (Fire & Forget)
        this.generateThumbnail(media).catch(e => this.logger.error(`Thumbnail generation failed for ${media.id}`, e));

        // AI Tasks
        if (options?.autoLabel) this.resolveAutoLabel(media.id);
        if (options?.generateEmbedding) this.resolveEmbedding(media.id);
    }

    // Thumbnail Generation Logic
    async generateThumbnail(media: MediaFile): Promise<void> {
        if (!media.mimeType || !media.s3Key || !media.bucketName) return;

        const isImage = media.mimeType.startsWith('image/');
        const isVideo = media.mimeType.startsWith('video/');
        const isPdf = media.mimeType === 'application/pdf';

        if (!isImage && !isVideo && !isPdf) return;

        this.logger.log(`Generating thumbnail for ${media.filename} (${media.mimeType})`);

        // 1. Download file to temp
        const tempDir = os.tmpdir();
        const inputPath = path.join(tempDir, `input-${media.id}-${Date.now()}`);
        const outputPath = path.join(tempDir, `thumb-${media.id}-${Date.now()}.webp`);

        try {
            // Sanitize key for MinIO (remove bucket prefix if present)
            let objectKey = media.s3Key;
            if (objectKey.startsWith(media.bucketName + '/')) {
                objectKey = objectKey.substring(media.bucketName.length + 1);
            }

            await this.minioClient.fGetObject(media.bucketName, objectKey, inputPath);

            // 2. Process based on type
            let processed = false;

            if (isImage) {
                await sharp(inputPath)
                    .resize(400, 400, { fit: 'inside' }) // Max 400px w/h, keep aspect ratio
                    .toFormat('webp')
                    .toFile(outputPath);
                processed = true;
            } else if (isVideo) {
                await new Promise<void>((resolve, reject) => {
                    ffmpeg(inputPath)
                        .screenshots({
                            count: 1,
                            timemarks: ['1'], // 1 second mark
                            filename: path.basename(outputPath),
                            folder: tempDir,
                            size: '400x?'
                        })
                        .on('end', () => resolve())
                        .on('error', (err) => reject(err));
                });
                processed = true;
            } else if (isPdf) {
                // PDF processing (Pages 1-3)
                const options = {
                    density: 100,
                    saveFilename: `preview-${media.id}`,
                    savePath: tempDir,
                    format: "png",
                    width: 600,  // Better quality for preview
                    height: 800
                };

                // Import dynamically if needed or assume top-level import exists/will be added
                // const { fromPath } = require("pdf2pic"); 
                // OR assuming fromPath is already imported. I'll use require to be safe if import missing.
                // Looking at previous file view, imports were not shown fully but likely missing.
                // I will add the import statement in a separate edit if needed, but for now assuming clean code.
                // Correct usage based on library:
                const { fromPath } = await import("pdf2pic");

                const convert = fromPath(inputPath, options);
                const previewPaths: string[] = [];

                // Generate up to 3 pages
                for (let page = 1; page <= 3; page++) {
                    try {
                        const result = await convert(page);
                        // result path: tempDir/preview-{id}.{page}.png
                        const generatedFile = result.path; // pdf2pic returns object with path

                        if (fs.existsSync(generatedFile)) {
                            // Upload to System Bucket
                            const s3PreviewKey = `_previews/${media.id}/page-${page}.png`;
                            await this.minioClient.fPutObject(this.SYSTEM_BUCKET_NAME, s3PreviewKey, generatedFile, {
                                'Content-Type': 'image/png'
                            });

                            // Make it public (if system bucket is public, good. If not, we presign).
                            // Store relative path in metadata
                            previewPaths.push(s3PreviewKey);

                            // Use Page 1 as the main thumbnail if not already present
                            if (page === 1) {
                                // Upload as main thumbnail too
                                const thumbKey = `_thumbnails/${media.id}.png`;
                                await this.minioClient.fPutObject(this.SYSTEM_BUCKET_NAME, thumbKey, generatedFile, {
                                    'Content-Type': 'image/png'
                                });
                                // Update media record with thumbnail path
                                await this.supabase.getAdminClient()
                                    .from('media')
                                    .update({ thumbnail_path: thumbKey })
                                    .eq('id', media.id);
                            }

                            // Cleanup temp file
                            fs.unlinkSync(generatedFile);
                        }
                    } catch (err: any) {
                        // Stop if page doesn't exist (e.g. 1-page PDF)
                        if (err.message && err.message.includes('Page')) {
                            break;
                        }
                        this.logger.warn(`Failed to generate preview for page ${page} of ${media.id}`, err);
                    }
                }

                // Update metadata with preview paths
                if (previewPaths.length > 0) {
                    const currentMeta = media.metadata || {};
                    const newMeta = { ...currentMeta, previewPages: previewPaths };
                    await this.supabase.getAdminClient()
                        .from('media')
                        .update({ metadata: newMeta })
                        .eq('id', media.id);
                }

                processed = true;
            }
            // For now, let's assume image/webp for consistency in typical app, but here simple is better.



            if (processed && fs.existsSync(outputPath)) {
                // 3. Upload Thumbnail
                const thumbKey = `_thumbnails/${media.s3Key}.webp`; // Append .webp or keep original ext
                // For simplicity, assume webp/png fits "preview" purpose

                // If it was valid image/video (Sharp/FFmpeg), it's at outputPath

                await this.minioClient.fPutObject(this.SYSTEM_BUCKET_NAME, thumbKey, outputPath, {
                    'Content-Type': 'image/webp'
                });

                // 4. Update DB
                await this.supabase.getAdminClient()
                    .from('media')
                    .update({ thumbnail_path: thumbKey })
                    .eq('id', media.id);

                this.logger.log(`Thumbnail generated and saved: ${thumbKey}`);
            }

        } catch (error) {
            this.logger.error(`Error processing thumbnail for ${media.s3Key}`, error);
        } finally {
            // Cleanup
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            // Cleanup PDF artifacts if any
            // const pdfArtifact = path.join(tempDir, `${path.basename(outputPath, '.webp')}.1.png`);
            // if (fs.existsSync(pdfArtifact)) fs.unlinkSync(pdfArtifact);
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

    private async resolveAutoLabel(id: string) {
        this.logger.log(`Triggering auto-label for ${id}`);
        await this.ragService.autoLabelMedia(id);
    }

    /** Generate pgvector embedding for media via internal RAG (Vertex / Google AI). */
    async resolveEmbedding(id: string, content = ''): Promise<boolean> {
        this.logger.log(`resolveEmbedding(${id}) via internal RAG`);
        const { data: currentMedia } = await this.supabase.getAdminClient()
            .from('media')
            .select('metadata')
            .eq('id', id)
            .single();

        await this.supabase.getAdminClient()
            .from('media')
            .update({
                metadata: {
                    ...(currentMedia?.metadata || {}),
                    embedding_status: 'parsing',
                    embedding_progress: 0.1,
                    embedding_chunk_count: 0,
                    embedding_error: null,
                },
            })
            .eq('id', id);

        try {
            const ok = await this.ragService.generateMediaEmbeddings(id, content);
            const { data: refreshed } = await this.supabase.getAdminClient()
                .from('media')
                .select('metadata')
                .eq('id', id)
                .single();

            await this.supabase.getAdminClient()
                .from('media')
                .update({
                    metadata: {
                        ...(refreshed?.metadata || {}),
                        embedding_status: ok ? 'done' : 'error',
                        embedding_progress: ok ? 1 : 0,
                        embedding_chunk_count: ok ? 1 : 0,
                        embedding_error: ok ? null : 'Embedding generation failed',
                    },
                })
                .eq('id', id);
            return ok;
        } catch (e: any) {
            this.logger.error(`resolveEmbedding failed for ${id}: ${e?.message ?? e}`);
            await this.supabase.getAdminClient()
                .from('media')
                .update({
                    metadata: {
                        ...(currentMedia?.metadata || {}),
                        embedding_status: 'error',
                        embedding_progress: 0,
                        embedding_chunk_count: 0,
                        embedding_error: e?.message || 'Embedding generation failed',
                    },
                })
                .eq('id', id);
            return false;
        }
    }

    async checkEmbeddingStatus(id: string): Promise<{
        status: 'none' | 'pending' | 'parsing' | 'done' | 'error';
        progress: number;
        chunkCount: number;
        progressMsg: string;
    }> {
        const { data: mediaRecord } = await this.supabase
            .getAdminClient()
            .from('media')
            .select('metadata')
            .eq('id', id)
            .single();

        const meta = mediaRecord?.metadata || {};
        const { data: embRow } = await this.supabase.getAdminClient()
            .from('media_embeddings')
            .select('id')
            .eq('id', id)
            .maybeSingle();

        if (embRow) {
            return {
                status: 'done',
                progress: 1,
                chunkCount: meta.embedding_chunk_count ?? 1,
                progressMsg: 'Indexed in media_embeddings (pgvector)',
            };
        }

        const status = meta.embedding_status as string | undefined;
        if (status === 'parsing' || status === 'pending') {
            return {
                status: status as 'parsing' | 'pending',
                progress: meta.embedding_progress ?? 0,
                chunkCount: meta.embedding_chunk_count ?? 0,
                progressMsg: 'Generating embedding…',
            };
        }
        if (status === 'error') {
            return {
                status: 'error',
                progress: 0,
                chunkCount: 0,
                progressMsg: meta.embedding_error || 'Embedding failed',
            };
        }

        return {
            status: 'none',
            progress: 0,
            chunkCount: 0,
            progressMsg: 'No embedding — generate here or add to an AI Studio notebook',
        };
    }

    async removeEmbedding(id: string): Promise<boolean> {
        this.logger.log(`Removing embedding for media ID: ${id}`);
        try {
            const { data: mediaRecord } = await this.supabase.getAdminClient()
                .from('media')
                .select('metadata')
                .eq('id', id)
                .single();

            const meta = mediaRecord?.metadata || {};

            await this.supabase.getAdminClient()
                .from('media_embeddings')
                .delete()
                .eq('id', id);

            const cleanMeta = { ...meta };
            delete cleanMeta.embedding_status;
            delete cleanMeta.embedding_progress;
            delete cleanMeta.embedding_chunk_count;
            delete cleanMeta.embedding_error;

            await this.supabase.getAdminClient()
                .from('media')
                .update({ metadata: cleanMeta, embedding: null })
                .eq('id', id);

            this.logger.log(`Successfully removed embedding for media ID: ${id}`);
            return true;
        } catch (err) {
            this.logger.error(`Exception removing embedding for ${id}:`, err);
            return false;
        }
    }

    // ---------------------------------------------------------
    // S3 Operations
    // ---------------------------------------------------------

    async listBuckets(): Promise<S3Bucket[]> {
        try {
            const buckets = await this.minioClient.listBuckets();

            // Determine privacy status for each bucket
            const bucketsWithPolicy = await Promise.all(buckets.map(async b => {
                let isPublic = false;
                try {
                    const policyStr = await this.minioClient.getBucketPolicy(b.name);
                    if (policyStr) {
                        const policy = JSON.parse(policyStr);
                        // Check for common Public Read pattern
                        const statements = Array.isArray(policy.Statement) ? policy.Statement : [policy.Statement];

                        for (const stmt of statements) {
                            if (!stmt) continue;
                            const effect = stmt.Effect;
                            if (effect !== 'Allow') continue;

                            const principal = stmt.Principal;
                            // Check if Principal is wildcard (Public)
                            const isPublicPrincipal = principal === '*' || (typeof principal === 'object' && (principal.AWS === '*' || (Array.isArray(principal.AWS) && principal.AWS.includes('*'))));

                            if (isPublicPrincipal) {
                                const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
                                // Must allow GetObject
                                if (actions.includes('s3:GetObject')) {
                                    isPublic = true;
                                    break; // Found public rule, bucket is public
                                }
                            }
                        }
                    }
                } catch (e: any) {
                    // Start 404 or NoSuchBucketPolicy is normal for private buckets
                    // Ignore error, remains private
                }

                return {
                    name: b.name,
                    creationDate: b.creationDate.toISOString(),
                    isPublic
                };
            }));

            return bucketsWithPolicy;
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
            const targetBucket = bucket || await this.getDefaultBucket();

            // Fetch count and total size from DB (more reliable for UI sync)
            const { data, error, count } = await this.supabase.getAdminClient()
                .from('media')
                .select('size_bytes', { count: 'exact' })
                .eq('bucket_name', targetBucket);

            if (error) throw error;

            let totalFiles = count || 0;
            let totalSizeBytes = (data as any[])?.reduce((acc, curr) => acc + (curr.size_bytes || 0), 0) || 0;

            // Fallback: If DB stats are empty but it's the specific system bucket, check S3 directly
            // This ensures we show accurate stats for system buckets that don't have DB records
            if ((totalFiles === 0 && targetBucket === this.SYSTEM_BUCKET_NAME) || targetBucket === this.SYSTEM_BUCKET_NAME) {
                try {
                    const objects = await this.listObjects(targetBucket, '', true);
                    if (objects.length > 0) {
                        totalFiles = objects.length;
                        totalSizeBytes = objects.reduce((acc, obj) => acc + obj.size, 0);
                    }
                } catch (err) {
                    this.logger.warn(`Failed to fetch S3 stats for ${targetBucket}: ${err.message}`);
                }
            }

            return {
                buckets,
                totalFiles,
                totalSizeBytes
            };
        } catch (e) {
            this.logger.error('getStorageStats failed', e);
            // Fallback to empty stats but keep bucket list
            try {
                const buckets = await this.listBuckets();
                return { buckets, totalFiles: 0, totalSizeBytes: 0 };
            } catch {
                return { buckets: [], totalFiles: 0, totalSizeBytes: 0 };
            }
        }
    }

    // Stub for future
    async getDefaultBucket(): Promise<string> {
        return this.configService.get('NEXT_PUBLIC_S3_BUCKET') || 'cms-media';
    }

    async getS3Endpoint(): Promise<string> {
        // Use S3_PUBLIC_ENDPOINT for browser-accessible URLs
        // Fall back to localhost:9000 which browsers can access (not 127.0.0.1)
        return this.configService.get('S3_PUBLIC_ENDPOINT')
            || this.configService.get('NEXT_PUBLIC_S3_ENDPOINT')
            || 'http://localhost:9000';
    }



    async deleteFolder(path: string, bucket?: string): Promise<boolean> {
        try {
            const targetBucket = bucket || await this.getDefaultBucket();

            // Ensure path ends with / for prefix matching
            const prefix = path.endsWith('/') ? path : `${path}/`;
            this.logger.log(`[deleteFolder] Start: prefix="${prefix}" bucket="${targetBucket}"`);

            // 1. Remove current objects first
            const objectsList: string[] = [];
            const stream = this.minioClient.listObjectsV2(targetBucket, prefix, true);
            for await (const obj of stream) {
                if (obj.name) objectsList.push(obj.name);
            }
            if (objectsList.length > 0) {
                await this.minioClient.removeObjects(targetBucket, objectsList);
                this.logger.log(`[deleteFolder] Removed ${objectsList.length} current objects`);
            }

            // 2. Remove folder markers (with and without trailing slash)
            for (const key of [prefix, prefix.replace(/\/+$/, '')]) {
                if (!key) continue;
                try { await this.minioClient.removeObject(targetBucket, key); } catch { }
            }

            // 3. Purge ALL versions and delete markers (critical for versioned buckets)
            // listObjects with IncludeVersion returns old versions + delete markers
            // that keep the prefix alive even after current objects are removed
            try {
                const versionStream = this.minioClient.listObjects(targetBucket, prefix, true, { IncludeVersion: true });
                let versionCount = 0;

                for await (const obj of versionStream) {
                    const key = obj.name || (obj as any).prefix;
                    const versionId = (obj as any).versionId;
                    if (key && versionId) {
                        try {
                            await this.minioClient.removeObject(targetBucket, key, { versionId } as any);
                            versionCount++;
                        } catch {
                            // OK - some versions might already be gone
                        }
                    }
                }

                // Also purge versions of the folder marker itself
                for (const markerKey of [prefix, prefix.replace(/\/+$/, '')]) {
                    if (!markerKey) continue;
                    try {
                        const markerStream = this.minioClient.listObjects(
                            targetBucket, markerKey, false, { IncludeVersion: true }
                        );
                        for await (const obj of markerStream) {
                            const vId = (obj as any).versionId;
                            if (obj.name === markerKey && vId) {
                                try {
                                    await this.minioClient.removeObject(targetBucket, markerKey, { versionId: vId } as any);
                                    versionCount++;
                                } catch { }
                            }
                        }
                    } catch { }
                }

                if (versionCount > 0) {
                    this.logger.log(`[deleteFolder] Purged ${versionCount} versions/markers`);
                }
            } catch (e) {
                this.logger.warn(`[deleteFolder] Version purge skipped: ${e}`);
            }

            this.logger.log(`[deleteFolder] Done`);
            return true;
        } catch (e) {
            this.logger.error('[deleteFolder] failed', e);
            return false;
        }
    }

    async deleteFileByKey(key: string, bucket?: string): Promise<boolean> {
        try {
            const targetBucket = bucket || await this.getDefaultBucket();
            await this.minioClient.removeObject(targetBucket, key);
            this.logger.log(`Deleted file ${key} from bucket ${targetBucket}`);
            return true;
        } catch (e) {
            this.logger.error('deleteFileByKey failed', e);
            return false;
        }
    }

    // Move file - copy then delete source
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
            this.logger.error(`moveFile failed. SourceKey: ${sourceKey}, DestKey: ${destKey}`);
            this.logger.error(e);
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
            return this.setBucketPolicy(JSON.stringify(policy), b);
        } catch (e) {
            this.logger.error('makeBucketPublic failed', e);
            return false;
        }
    }

    async getBucketPolicy(bucket?: string): Promise<any> {
        try {
            const b = bucket || await this.getDefaultBucket();
            // minioClient.getBucketPolicy returns string
            const policyStr = await this.minioClient.getBucketPolicy(b);
            if (!policyStr) return {};
            return JSON.parse(policyStr);
        } catch (e: any) {
            // S3 NoSuchBucketPolicy error
            if (e.code === 'NoSuchBucketPolicy') return {};
            this.logger.warn(`getBucketPolicy failed or empty for ${bucket}: ${e.message}`);
            return {};
        }
    }

    async setBucketPolicy(policy: string | Record<string, any>, bucket?: string): Promise<boolean> {
        try {
            const b = bucket || await this.getDefaultBucket();
            const policyStr = typeof policy === 'string' ? policy : JSON.stringify(policy);
            await this.minioClient.setBucketPolicy(b, policyStr);
            this.logger.log(`Policy set for bucket ${b}`);
            return true;
        } catch (e) {
            this.logger.error(`setBucketPolicy failed for ${bucket}`, e);
            return false;
        }
    }

    async deleteBucketPolicy(bucket?: string): Promise<boolean> {
        try {
            const b = bucket || await this.getDefaultBucket();
            // Minio library might not have removeBucketPolicy in type defs if old, but it should exist.
            // If not, setting empty string or specific call needed.
            // checking minio docs: setBucketPolicy(bucket, '') removes it in some versions,
            // or explicit setBucketPolicy with empty string.
            // Actually, client has setBucketPolicy. 
            // Let's try passing empty string to clear it.
            await this.minioClient.setBucketPolicy(b, '');
            this.logger.log(`Policy removed (made private) for bucket ${b}`);
            return true;
        } catch (e) {
            this.logger.error(`deleteBucketPolicy failed for ${bucket}`, e);
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

    async deleteBucket(bucket: string): Promise<boolean> {
        if (bucket === this.SYSTEM_BUCKET_NAME) {
            this.logger.warn(`Rejected attempt to delete system bucket: ${bucket}`);
            return false;
        }

        try {
            this.logger.log(`Attempting to delete bucket: ${bucket}`);

            // 1. Purge all object versions (including current ones and delete markers)
            // This is required if the bucket has ever had versioning enabled.
            const versionStream = this.minioClient.listObjects(bucket, '', true, { IncludeVersion: true });
            const objectsToRemove: any[] = [];

            for await (const version of versionStream) {
                if (version.name) {
                    objectsToRemove.push({ name: version.name, versionId: (version as any).versionId });
                }
            }

            if (objectsToRemove.length > 0) {
                this.logger.log(`Purging ${objectsToRemove.length} object versions from ${bucket}...`);
                await this.minioClient.removeObjects(bucket, objectsToRemove);
            }

            // 2. Cleanup Database records for this bucket
            const { error: dbError } = await this.supabase.getAdminClient()
                .from('media')
                .delete()
                .eq('bucket_name', bucket);

            if (dbError) {
                this.logger.error(`Database cleanup failed for bucket ${bucket}:`, dbError);
                // Continue to try and delete the bucket anyway
            }

            // 3. Delete the bucket itself
            await this.minioClient.removeBucket(bucket);
            this.logger.log(`Successfully deleted bucket: ${bucket}`);

            return true;
        } catch (e) {
            this.logger.error(`deleteBucket failed for ${bucket}`, e);
            return false;
        }
    }



    // Helpers


    async createBucket(name: string): Promise<boolean> {
        // Validate name (basic S3 rules: lowercase, no spaces, 3-63 chars)
        if (!/^[a-z0-9.-]{3,63}$/.test(name)) {
            this.logger.error(`Invalid bucket name: ${name}`);
            return false;
        }

        try {
            const exists = await this.minioClient.bucketExists(name);
            if (exists) {
                this.logger.warn(`Bucket already exists: ${name}`);
                return false;
            }

            // Create Bucket
            await this.minioClient.makeBucket(name, 'us-east-1'); // Region is required but often ignored by MinIO
            this.logger.log(`Bucket created: ${name}`);

            // Set Public Policy (Read-Only)
            const policy = {
                Version: '2012-10-17',
                Statement: [
                    {
                        Action: ['s3:GetObject'],
                        Effect: 'Allow',
                        Principal: '*',
                        Resource: [`arn:aws:s3:::${name}/*`],
                    },
                ],
            };
            await this.minioClient.setBucketPolicy(name, JSON.stringify(policy));

            // Enable Versioning
            await this.minioClient.setBucketVersioning(name, { Status: 'Enabled' });

            return true;
        } catch (e) {
            this.logger.error(`createBucket failed for ${name}`, e);
            return false;
        }
    }

    async createFolder(path: string, bucket?: string): Promise<boolean> {
        const b = bucket || await this.getDefaultBucket();
        // Ensure path ends with /
        const folderKey = path.endsWith('/') ? path : `${path}/`;

        try {
            // Check if exists
            try {
                await this.minioClient.statObject(b, folderKey);
                this.logger.warn(`Folder already exists: ${folderKey} in ${b}`);
                return true; // Treat as success
            } catch (err) {
                // Not found, proceed to create
            }

            // Create 0-byte object
            await this.minioClient.putObject(b, folderKey, Buffer.from(''));
            this.logger.log(`Folder created: ${folderKey} in ${b}`);
            return true;
        } catch (e) {
            this.logger.error(`createFolder failed for ${folderKey} in ${b}`, e);
            return false;
        }
    }


    // ═══════════════════════════════════════════════════════════════════════════
    // OBJECT VERSIONING OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    async listObjectVersions(key: string, bucket?: string): Promise<Array<{ key: string; versionId: string; lastModified: string; size: number; isLatest: boolean }>> {
        try {
            const b = bucket || await this.getDefaultBucket();

            // MinIO listObjects with IncludeVersion: true
            const versionStream = this.minioClient.listObjects(b, key, true, { IncludeVersion: true });
            const versions: any[] = [];

            for await (const version of versionStream) {
                if (version.name === key) {
                    versions.push({
                        key: version.name,
                        versionId: (version as any).versionId,
                        lastModified: version.lastModified.toISOString(),
                        size: version.size,
                        isLatest: (version as any).isLatest === 'true' || (version as any).isLatest === true
                    });
                }
            }

            return versions.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
        } catch (e) {
            this.logger.error(`listObjectVersions failed for ${key}`, e);
            return [];
        }
    }

    async restoreVersion(key: string, versionId: string, bucket?: string): Promise<boolean> {
        try {
            const b = bucket || await this.getDefaultBucket();

            // Restore by copying the specific version to the latest
            // MinIO/S3 source format with versionId
            const copySource = `/${b}/${key}?versionId=${versionId}`;
            await this.minioClient.copyObject(b, key, copySource, new Minio.CopyConditions());

            this.logger.log(`Restored version ${versionId} for ${key} in ${b}`);
            return true;
        } catch (e) {
            this.logger.error(`restoreVersion failed for ${key} version ${versionId}`, e);
            return false;
        }
    }

    async getVersionPresignedUrl(key: string, versionId: string, bucket?: string, expiresIn = 3600): Promise<string> {
        try {
            const b = bucket || await this.getDefaultBucket();
            // Pass versionId in request parameters
            return await this.minioClient.presignedGetObject(b, key, expiresIn, { versionId: versionId });
        } catch (e) {
            this.logger.error(`getVersionPresignedUrl failed`, e);
            throw e;
        }
    }
}
