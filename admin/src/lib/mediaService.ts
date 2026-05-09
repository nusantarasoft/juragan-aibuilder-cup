/**
 * Media Service - All operations via GraphQL Middleware
 * No direct S3 access from frontend - all S3 ops go through middleware
 */


export interface UploadResult {
    success: boolean;
    media?: MediaFile;
    error?: string;
}

export interface MediaSearchResult {
    id: string;
    filename: string;
    url: string;
    similarity: number;
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

export interface LifecycleRule {
    id: string;
    prefix?: string;
    enabled: boolean;
    expirationDays?: number;
    transitionDays?: number;
    transitionStorageClass?: string;
}

export interface StorageStats {
    totalFiles: number;
    totalSizeBytes: number;
    buckets: S3Bucket[];
}

// GraphQL URL for media operations
const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';

async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        cache: 'no-store',
    });
    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
}

// GraphQL returns camelCase, we need snake_case for backward compatibility
export interface MediaFile {
    id: string;
    filename: string;
    original_name?: string;
    url: string;
    s3_key?: string;
    mime_type?: string;
    size_bytes?: number;
    alt_text?: string;
    description?: string;
    uploaded_by?: string;
    embedding?: string;
    created_at: string;
    updated_at?: string;
    metadata?: any;
    bucket_name?: string;
    checksum?: string;
    thumbnail_path?: string;
    thumbnailUrl?: string; // Signed URL for frontend
    previewPages?: string[]; // JSON array of page image paths
}

interface GraphQLMediaFile {
    id: string;
    filename: string;
    originalName?: string;
    url: string;
    s3Key?: string;
    mimeType?: string;
    sizeBytes?: number;
    altText?: string;
    description?: string;
    uploadedBy?: string;
    embedding?: string;
    createdAt: string;
    updatedAt?: string;
    metadata?: any;
    bucketName?: string;
    checksum?: string;
    thumbnailUrl?: string;
    thumbnailPath?: string;
    previewPages?: string[];
}

// Convert internal minio:9000 URLs to browser-accessible localhost:9000 URLs
function normalizeMinioUrl(url: string | undefined): string | undefined {
    if (!url) return url;
    // Replace Docker internal hostname with localhost for browser access
    // Handle both http and https, and potentially other internal names map if needed
    let newUrl = url.replace(/http:\/\/minio:9000/g, 'http://localhost:9000');
    newUrl = newUrl.replace(/http:\/\/middleware:3000/g, 'http://localhost:3000');
    return newUrl;
}

// Map camelCase GraphQL response to snake_case MediaFile
function mapToMediaFile(gql: GraphQLMediaFile): MediaFile {
    return {
        id: gql.id,
        filename: gql.filename,
        original_name: gql.originalName,
        url: normalizeMinioUrl(gql.url) || gql.url,
        s3_key: gql.s3Key,
        mime_type: gql.mimeType,
        size_bytes: gql.sizeBytes,
        alt_text: gql.altText,
        description: gql.description,
        uploaded_by: gql.uploadedBy,
        embedding: gql.embedding,
        created_at: gql.createdAt,
        updated_at: gql.updatedAt,
        metadata: gql.metadata,
        bucket_name: gql.bucketName,
        checksum: gql.checksum,
        thumbnail_path: gql.thumbnailPath,
        thumbnailUrl: normalizeMinioUrl(gql.thumbnailUrl) || gql.thumbnailUrl,
        previewPages: gql.previewPages,
    };
}

// Media Service - All operations via GraphQL
export const mediaService = {
    // ═══════════════════════════════════════════════════════════════════════════
    // MEDIA CRUD OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // Upload media file via GraphQL (file goes to middleware → MinIO)
    async uploadMedia(
        file: File,
        folder?: string,
        bucket?: string,
        altText?: string,
        autoLabel: boolean = false,
        generateEmbedding: boolean = false,
        onConflict: 'RENAME' | 'OVERWRITE' | 'ERROR' = 'ERROR'
    ): Promise<MediaFile | null> {
        try {
            // Use GraphQL multipart upload
            const formData = new FormData();

            const operations = JSON.stringify({
                query: `
                    mutation UploadMedia($file: Upload!, $folder: String, $bucket: String, $altText: String, $autoLabel: Boolean, $generateEmbedding: Boolean, $onConflict: String) {
                        uploadMedia(file: $file, folder: $folder, bucket: $bucket, altText: $altText, autoLabel: $autoLabel, generateEmbedding: $generateEmbedding, onConflict: $onConflict) {
                            id
                            filename
                            url
                            mimeType
                            sizeBytes
                            altText
                            createdAt
                            updatedAt
                            bucketName
                            s3Key
                            thumbnailUrl
                            previewPages
                        }
                    }
                `,
                variables: {
                    file: null,
                    folder,
                    bucket,
                    altText,
                    autoLabel,
                    generateEmbedding,
                    onConflict
                },
            });

            const map = JSON.stringify({ '0': ['variables.file'] });

            formData.append('operations', operations);
            formData.append('map', map);
            formData.append('0', file);

            const response = await fetch(GRAPHQL_URL, {
                method: 'POST',
                headers: {
                    'apollo-require-preflight': 'true',
                },
                body: formData,
            });

            const json = await response.json();
            if (json.errors) throw new Error(json.errors[0].message);

            return mapToMediaFile(json.data.uploadMedia);
        } catch (error: unknown) {
            console.error("Error uploading media:", error);
            // Re-throw to allow caller to handle conflict errors
            throw error;
        }
    },

    async checkDuplicateMedia(filename: string, folder: string): Promise<boolean> {
        const query = `
            query CheckDuplicateMedia($filename: String!, $folder: String!) {
                checkDuplicateMedia(filename: $filename, folder: $folder)
            }
        `;
        try {
            const data = await graphqlRequest<{ checkDuplicateMedia: boolean }>(query, { filename, folder });
            return data.checkDuplicateMedia;
        } catch (error) {
            console.error("Error checking duplicate:", error);
            return false;
        }
    },

    // Get all media files
    async getMedia(options?: {
        limit?: number;
        offset?: number;
        mimeType?: string;
        bucket?: string;
        folder?: string;
    }): Promise<MediaFile[]> {
        const query = `
            query Media($limit: Int, $offset: Int, $mimeType: String, $bucket: String, $folder: String) {
                media(limit: $limit, offset: $offset, mimeType: $mimeType, bucket: $bucket, folder: $folder) {
                    id
                    filename
                    originalName
                    url
                    s3Key
                    mimeType
                    sizeBytes
                    altText
                    createdAt
                    metadata
                    embedding
                    bucketName
                    thumbnailUrl
                    checksum
                    thumbnailPath
                    previewPages
                }
            }
        `;

        try {
            const data = await graphqlRequest<{ media: GraphQLMediaFile[] }>(query, {
                limit: options?.limit,
                offset: options?.offset,
                mimeType: options?.mimeType,
                bucket: options?.bucket,
                folder: options?.folder,
            });
            return (data.media || []).map(mapToMediaFile);
        } catch (error) {
            console.error("Error fetching media:", error);
            return [];
        }
    },

    // Get single media file
    async getMediaById(id: string): Promise<MediaFile | null> {
        const query = `
            query MediaById($id: ID!) {
                mediaById(id: $id) {
                    id
                    filename
                    originalName
                    url
                    s3Key
                    mimeType
                    sizeBytes
                    altText
                    createdAt
                    embedding
                    metadata
                    bucketName
                    thumbnailUrl
                    checksum
                    thumbnailPath
                    previewPages
                }
            }
        `;

        try {
            const data = await graphqlRequest<{ mediaById: GraphQLMediaFile }>(query, { id });
            return data.mediaById ? mapToMediaFile(data.mediaById) : null;
        } catch (error) {
            console.error("Error fetching media:", error);
            return null;
        }
    },

    async getMediaByS3Key(key: string): Promise<MediaFile | null> {
        const query = `
            query MediaByS3Key($key: String!) {
                mediaByS3Key(key: $key) {
                    id
                    filename
                    originalName
                    url
                    s3Key
                    mimeType
                    sizeBytes
                    altText
                    createdAt
                    embedding
                    metadata
                    bucketName
                    thumbnailUrl
                    checksum
                    thumbnailPath
                    previewPages
                }
            }
        `;

        try {
            const data = await graphqlRequest<{ mediaByS3Key: GraphQLMediaFile }>(query, { key });
            return data.mediaByS3Key ? mapToMediaFile(data.mediaByS3Key) : null;
        } catch (error) {
            console.error("Error fetching media by key:", error);
            return null;
        }
    },

    // Get presigned URL for private access (via GraphQL)
    async getMediaUrl(id: string, expiresIn = 3600): Promise<string | null> {
        const query = `
            query GetDownloadUrl($id: ID!, $expiresIn: Int) {
                getDownloadUrl(id: $id, expiresIn: $expiresIn)
            }
        `;

        try {
            const data = await graphqlRequest<{ getDownloadUrl: string | null }>(query, { id, expiresIn });
            return data.getDownloadUrl;
        } catch (error) {
            console.error("Error getting download URL:", error);
            return null;
        }
    },

    // Delete media file (middleware handles both DB and S3)
    async deleteMedia(id: string): Promise<boolean> {
        const mutation = `
            mutation DeleteMedia($id: ID!) {
                deleteMedia(id: $id) {
                    success
                }
            }
        `;

        try {
            const data = await graphqlRequest<{ deleteMedia: { success: boolean } }>(mutation, { id });
            return data.deleteMedia.success;
        } catch (error) {
            console.error("Error deleting media:", error);
            return false;
        }
    },

    // Update media metadata
    async updateMedia(
        id: string,
        updates: Partial<Pick<MediaFile, "alt_text" | "filename" | "description">>
    ): Promise<MediaFile | null> {
        const mutation = `
            mutation UpdateMedia($id: ID!, $input: UpdateMediaInput!) {
                updateMedia(id: $id, updateMediaInput: $input) {
                    id
                    filename
                    url
                    altText
                }
            }
        `;

        try {
            const data = await graphqlRequest<{ updateMedia: GraphQLMediaFile }>(mutation, {
                id,
                input: { altText: updates.alt_text, filename: updates.filename, description: updates.description },
            });
            return data.updateMedia ? mapToMediaFile(data.updateMedia) : null;
        } catch (error) {
            console.error("Error updating media:", error);
            return null;
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // FOLDER OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    async listFolders(prefix?: string, bucket?: string): Promise<S3Object[]> {
        console.log(`[MediaService] listing folders for ${bucket} prefix=${prefix} (Strict Filter Active)`);
        const query = `
            query ListFolders($prefix: String, $bucket: String) {
                listFolders(prefix: $prefix, bucket: $bucket) {
                    key
                    size
                    lastModified
                    isFolder
                }
            }
        `;

        try {
            const data = await graphqlRequest<{ listFolders: S3Object[] }>(query, { prefix, bucket });
            // Filter out the folder itself to prevent infinite recursion in UI
            // Normalize by removing trailing slashes for comparison
            const normalize = (str: string | undefined) => (str || '').replace(/\/+$/, '');
            const safePrefix = normalize(prefix);
            const prefixDepth = safePrefix === '' ? 0 : safePrefix.split('/').length;

            console.log(`[MediaService] Raw folders:`, data.listFolders?.length, `PrefixDepth: ${prefixDepth} (${safePrefix})`);

            return (data.listFolders || []).filter(f => {
                const safeKey = normalize(f.key);

                // Debug Log
                // console.log(`[MediaService] Checking: ${f.key} (Safe: ${safeKey}) vs Prefix: ${safePrefix}`);

                // 1. Block Self-reference
                if (safeKey === safePrefix) {
                    console.log(`[MediaService] Blocking self-ref: ${f.key}`);
                    return false;
                }

                // 2. Block Grandchildren (Strict tree depth)
                // Backend listObjects(recursive=false) should handle this, but strictly enforcing here
                // caused issues with some folder visibility.
                // const childDepth = safeKey.split('/').length;
                // if (childDepth !== prefixDepth + 1) {
                //     console.log(`Blocking depth mismatch: ${safeKey} (Depth: ${childDepth}, Expected: ${prefixDepth + 1})`);
                //     return false;
                // }

                return true;
            });
        } catch (error) {
            console.error("Error listing folders:", error);
            return [];
        }
    },

    async listFilesInFolder(prefix?: string, bucket?: string): Promise<S3Object[]> {
        const query = `
            query ListFilesInFolder($prefix: String, $bucket: String) {
                listFilesInFolder(prefix: $prefix, bucket: $bucket) {
                    key
                    size
                    lastModified
                    isFolder
                }
            }
        `;

        try {
            const data = await graphqlRequest<{ listFilesInFolder: S3Object[] }>(query, { prefix, bucket });
            return data.listFilesInFolder || [];
        } catch (error) {
            console.error("Error listing files:", error);
            return [];
        }
    },

    async createFolder(path: string, bucket?: string): Promise<boolean> {
        const mutation = `
            mutation CreateFolder($path: String!, $bucket: String) {
                createFolder(path: $path, bucket: $bucket)
            }
        `;

        try {
            console.log(`[MediaService] createFolder: path=${path} bucket=${bucket}`);
            const data = await graphqlRequest<{ createFolder: boolean }>(mutation, { path, bucket });
            console.log(`[MediaService] createFolder result:`, data.createFolder);
            return data.createFolder;
        } catch (error) {
            console.error("Error creating folder:", error);
            return false;
        }
    },

    async deleteFolder(path: string, bucket?: string): Promise<boolean> {
        const mutation = `
            mutation DeleteFolder($path: String!, $bucket: String) {
                deleteFolder(path: $path, bucket: $bucket)
            }
        `;

        try {
            const data = await graphqlRequest<{ deleteFolder: boolean }>(mutation, { path, bucket });
            return data.deleteFolder;
        } catch (error) {
            console.error("Error deleting folder:", error);
            return false;
        }
    },

    // Delete file by S3 key (for files from S3 listing that don't have DB IDs)
    async deleteFileByKey(key: string, bucket?: string): Promise<boolean> {
        const mutation = `
            mutation DeleteFileByKey($key: String!, $bucket: String) {
                deleteFileByKey(key: $key, bucket: $bucket)
            }
        `;

        try {
            const data = await graphqlRequest<{ deleteFileByKey: boolean }>(mutation, { key, bucket });
            return data.deleteFileByKey;
        } catch (error) {
            console.error("Error deleting file by key:", error);
            return false;
        }
    },

    async moveFile(sourceKey: string, destKey: string, sourceBucket?: string, destBucket?: string): Promise<boolean> {
        const mutation = `
            mutation MoveFile($sourceKey: String!, $destKey: String!, $sourceBucket: String, $destBucket: String) {
                moveFile(sourceKey: $sourceKey, destKey: $destKey, sourceBucket: $sourceBucket, destBucket: $destBucket)
            }
        `;

        try {
            const data = await graphqlRequest<{ moveFile: boolean }>(mutation, { sourceKey, destKey, sourceBucket, destBucket });
            return data.moveFile;
        } catch (error) {
            console.error("Error moving file:", error);
            return false;
        }
    },

    async copyFile(sourceKey: string, destKey: string, sourceBucket?: string, destBucket?: string): Promise<boolean> {
        const mutation = `
            mutation CopyFile($sourceKey: String!, $destKey: String!, $sourceBucket: String, $destBucket: String) {
                copyFile(sourceKey: $sourceKey, destKey: $destKey, sourceBucket: $sourceBucket, destBucket: $destBucket)
            }
        `;

        try {
            const data = await graphqlRequest<{ copyFile: boolean }>(mutation, { sourceKey, destKey, sourceBucket, destBucket });
            return data.copyFile;
        } catch (error) {
            console.error("Error copying file:", error);
            return false;
        }
    },

    // Composite operation: Move Folder (Client-side orchestration)
    async moveFolder(sourcePath: string, destPath: string, sourceBucket: string, destBucket: string): Promise<boolean> {
        try {
            console.log(`[MediaService] Moving folder ${sourcePath} from ${sourceBucket} to ${destPath} in ${destBucket}`);

            // 1. List files in SOURCE bucket
            const files = await this.listFilesInFolder(sourcePath, sourceBucket);

            const movePromises = files.map(file => {
                const fileName = file.key.replace(sourcePath, ''); // Get relative path
                // Ensure no double slashes if destPath has trailing slash
                const cleanDest = destPath.endsWith('/') ? destPath : destPath + '/';
                const targetKey = cleanDest + fileName;

                // Pass distinct source and dest buckets
                return this.moveFile(file.key, targetKey, sourceBucket, destBucket);
            });

            await Promise.all(movePromises);

            // 2. Cleanup Source (if distinct path or bucket)
            // Just try to delete the source folder marker/prefix
            if (sourceBucket !== destBucket || sourcePath !== destPath) {
                await this.deleteFolder(sourcePath, sourceBucket);
            }

            return true;
        } catch (err) {
            console.error("Error moving folder:", err);
            return false;
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // BUCKET OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    async listBuckets(): Promise<S3Bucket[]> {
        const query = `
            query ListBuckets {
                listBuckets {
                    name
                    creationDate
                }
            }
        `;

        try {
            console.log('[MediaService] listBuckets called');
            const data = await graphqlRequest<{ listBuckets: S3Bucket[] }>(query);
            console.log(`[MediaService] listBuckets success: ${data.listBuckets?.length} buckets`);
            return data.listBuckets || [];
        } catch (error) {
            console.error("Error listing buckets:", error);
            return [];
        }
    },

    async createBucket(name: string): Promise<boolean> {
        const mutation = `
            mutation CreateBucket($name: String!) {
                createBucket(name: $name)
            }
        `;

        try {
            console.log(`[MediaService] createBucket: ${name}`);
            const data = await graphqlRequest<{ createBucket: boolean }>(mutation, { name });
            console.log(`[MediaService] createBucket result:`, data.createBucket);
            return data.createBucket;
        } catch (error) {
            console.error("Error creating bucket:", error);
            return false;
        }
    },

    async deleteBucket(name: string): Promise<boolean> {
        const mutation = `
            mutation DeleteBucket($bucket: String!) {
                deleteBucket(bucket: $bucket)
            }
        `;

        try {
            const data = await graphqlRequest<{ deleteBucket: boolean }>(mutation, { bucket: name });
            return data.deleteBucket;
        } catch (error) {
            console.error("Error deleting bucket:", error);
            return false;
        }
    },

    async makeBucketPublic(bucket?: string): Promise<boolean> {
        const mutation = `
            mutation MakeBucketPublic($bucket: String) {
                makeBucketPublic(bucket: $bucket)
            }
        `;

        try {
            const data = await graphqlRequest<{ makeBucketPublic: boolean }>(mutation, { bucket });
            return data.makeBucketPublic;
        } catch (error) {
            console.error("Error making bucket public:", error);
            return false;
        }
    },

    async getBucketPolicy(bucket?: string): Promise<Record<string, any> | null> {
        const query = `
            query GetBucketPolicy($bucket: String) {
                getBucketPolicy(bucket: $bucket)
            }
        `;

        try {
            const data = await graphqlRequest<{ getBucketPolicy: Record<string, any> }>(query, { bucket });
            return data.getBucketPolicy;
        } catch (error) {
            console.error("Error getting bucket policy:", error);
            return null;
        }
    },

    async setBucketPolicy(policy: Record<string, any>, bucket?: string): Promise<boolean> {
        const mutation = `
            mutation SetBucketPolicy($policy: JSON!, $bucket: String) {
                setBucketPolicy(policy: $policy, bucket: $bucket)
            }
        `;

        try {
            const data = await graphqlRequest<{ setBucketPolicy: boolean }>(mutation, { policy, bucket });
            return data.setBucketPolicy;
        } catch (error) {
            console.error("Error setting bucket policy:", error);
            return false;
        }
    },

    async deleteBucketPolicy(bucket?: string): Promise<boolean> {
        const mutation = `
            mutation DeleteBucketPolicy($bucket: String) {
                deleteBucketPolicy(bucket: $bucket)
            }
        `;

        try {
            const data = await graphqlRequest<{ deleteBucketPolicy: boolean }>(mutation, { bucket });
            return data.deleteBucketPolicy;
        } catch (error) {
            console.error("Error deleting bucket policy:", error);
            return false;
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // VERSIONING OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    async getVersioningStatus(bucket?: string): Promise<string> {
        const query = `
            query GetVersioningStatus($bucket: String) {
                getVersioningStatus(bucket: $bucket)
            }
        `;

        try {
            const data = await graphqlRequest<{ getVersioningStatus: string }>(query, { bucket });
            return data.getVersioningStatus;
        } catch (error) {
            console.error("Error getting versioning status:", error);
            return 'Unknown';
        }
    },

    async enableVersioning(bucket?: string): Promise<boolean> {
        const mutation = `
            mutation EnableVersioning($bucket: String) {
                enableVersioning(bucket: $bucket)
            }
        `;

        try {
            const data = await graphqlRequest<{ enableVersioning: boolean }>(mutation, { bucket });
            return data.enableVersioning;
        } catch (error) {
            console.error("Error enabling versioning:", error);
            return false;
        }
    },

    async disableVersioning(bucket?: string): Promise<boolean> {
        const mutation = `
            mutation DisableVersioning($bucket: String) {
                disableVersioning(bucket: $bucket)
            }
        `;

        try {
            const data = await graphqlRequest<{ disableVersioning: boolean }>(mutation, { bucket });
            return data.disableVersioning;
        } catch (error) {
            console.error("Error disabling versioning:", error);
            return false;
        }
    },

    async listObjectVersions(key: string): Promise<Array<{ key: string; versionId: string; lastModified: string; size: number; isLatest: boolean }>> {
        const query = `
            query ListObjectVersions($key: String!) {
                listObjectVersions(key: $key) {
                    key
                    versionId
                    lastModified
                    size
                    isLatest
                }
            }
        `;

        try {
            const data = await graphqlRequest<{ listObjectVersions: Array<{ key: string; versionId: string; lastModified: string; size: number; isLatest: boolean }> }>(query, { key });
            return data.listObjectVersions || [];
        } catch (error) {
            console.error("Error listing versions:", error);
            return [];
        }
    },

    async setDefaultVersion(key: string, versionId: string): Promise<boolean> {
        const mutation = `
            mutation SetDefaultVersion($key: String!, $versionId: String!) {
                setDefaultVersion(key: $key, versionId: $versionId)
            }
        `;

        try {
            const data = await graphqlRequest<{ setDefaultVersion: boolean }>(mutation, { key, versionId });
            return data.setDefaultVersion;
        } catch (error) {
            console.error("Error setting default version:", error);
            return false;
        }
    },

    async removeMediaEmbeddings(id: string): Promise<boolean> {
        console.log('[mediaService] Removing embeddings for ID:', id);
        const mutation = `
            mutation RemoveMediaEmbeddings($id: String!) {
                removeMediaEmbeddings(id: $id)
            }
        `;

        try {
            console.log('[mediaService] Sending removeMediaEmbeddings mutation...');
            const data = await graphqlRequest<{ removeMediaEmbeddings: boolean }>(mutation, { id });
            console.log('[mediaService] Remove result:', data);
            return data.removeMediaEmbeddings;
        } catch (error) {
            console.error("Error removing embeddings:", error);
            return false;
        }
    },

    async getVersionPresignedUrl(key: string, versionId: string): Promise<string | null> {
        const query = `
            query GetVersionPresignedUrl($key: String!, $versionId: String!) {
                getVersionPresignedUrl(key: $key, versionId: $versionId)
            }
        `;

        try {
            const data = await graphqlRequest<{ getVersionPresignedUrl: string }>(query, { key, versionId });
            return normalizeMinioUrl(data.getVersionPresignedUrl) || null;
        } catch (error) {
            console.error("Error getting version url:", error);
            return null;
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // LIFECYCLE OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    async getLifecycleRules(bucket?: string): Promise<LifecycleRule[]> {
        const query = `
            query GetLifecycleRules($bucket: String) {
                getLifecycleRules(bucket: $bucket) {
                    id
                    prefix
                    enabled
                    expirationDays
                    transitionDays
                    transitionStorageClass
                }
            }
        `;

        try {
            const data = await graphqlRequest<{ getLifecycleRules: LifecycleRule[] }>(query, { bucket });
            return data.getLifecycleRules || [];
        } catch (error) {
            console.error("Error getting lifecycle rules:", error);
            return [];
        }
    },

    async setLifecycleRules(rules: LifecycleRule[], bucket?: string): Promise<boolean> {
        const mutation = `
            mutation SetLifecycleRules($rules: [LifecycleRuleInput!]!, $bucket: String) {
                setLifecycleRules(rules: $rules, bucket: $bucket)
            }
        `;

        try {
            const data = await graphqlRequest<{ setLifecycleRules: boolean }>(mutation, { rules, bucket });
            return data.setLifecycleRules;
        } catch (error) {
            console.error("Error setting lifecycle rules:", error);
            return false;
        }
    },

    async deleteLifecycleRules(bucket?: string): Promise<boolean> {
        const mutation = `
            mutation DeleteLifecycleRules($bucket: String) {
                deleteLifecycleRules(bucket: $bucket)
            }
        `;

        try {
            const data = await graphqlRequest<{ deleteLifecycleRules: boolean }>(mutation, { bucket });
            return data.deleteLifecycleRules;
        } catch (error) {
            console.error("Error deleting lifecycle rules:", error);
            return false;
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // STATS & INFO
    // ═══════════════════════════════════════════════════════════════════════════

    async getStorageStats(bucket?: string): Promise<StorageStats | null> {
        const query = `
            query GetStorageStats($bucket: String) {
                getStorageStats(bucket: $bucket) {
                    totalFiles
                    totalSizeBytes
                    buckets {
                        name
                        creationDate
                    }
                }
            }
        `;

        try {
            const data = await graphqlRequest<{ getStorageStats: StorageStats }>(query, { bucket });
            return data.getStorageStats;
        } catch (error) {
            console.error("Error getting storage stats:", error);
            return null;
        }
    },

    async getDefaultBucket(): Promise<string> {
        const query = `
            query GetDefaultBucket {
                getDefaultBucket
            }
        `;

        try {
            const data = await graphqlRequest<{ getDefaultBucket: string }>(query);
            return data.getDefaultBucket;
        } catch (error) {
            console.error("Error getting default bucket:", error);
            return 'cms-media';
        }
    },

    async getS3Endpoint(): Promise<string> {
        const query = `
            query GetS3Endpoint {
                getS3Endpoint
            }
        `;

        try {
            const data = await graphqlRequest<{ getS3Endpoint: string }>(query);
            return data.getS3Endpoint;
        } catch (error) {
            console.error("Error getting S3 endpoint:", error);
            return 'http://127.0.0.1:9000';
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SEARCH (placeholder for future)
    // ═══════════════════════════════════════════════════════════════════════════

    async searchSimilar(
        queryEmbedding: number[],
        options?: { threshold?: number; limit?: number }
    ): Promise<MediaSearchResult[]> {
        console.warn("searchSimilar not yet implemented");
        return [];
    },

    async searchByText(query: string, limit = 10): Promise<MediaSearchResult[]> {
        console.warn("searchByText not yet implemented");
        return [];
    },

    async semanticSearch(query: string, limit = 10): Promise<MediaSearchResult[]> {
        console.warn("semanticSearch not yet implemented");
        return [];
    },

    async generateMediaEmbeddings(id: string, content: string): Promise<boolean> {
        console.log('[mediaService] Generating embeddings for:', id, 'content:', content ? content.substring(0, 50) : '(empty)');
        const mutation = `
            mutation GenerateMediaEmbeddings($id: String!, $content: String) {
                generateMediaEmbeddings(id: $id, content: $content)
            }
        `;

        try {
            console.log('[mediaService] Sending generateMediaEmbeddings mutation...');
            const data = await graphqlRequest<{ generateMediaEmbeddings: boolean }>(mutation, { id, content });
            console.log('[mediaService] Embedding result:', data);
            return data.generateMediaEmbeddings;
        } catch (error) {
            console.error("[mediaService] Error generating embeddings:", error);
            throw error; // Re-throw to allow UI to show specific error
        }
    },

    async getEmbeddingStatus(id: string): Promise<{
        status: string;
        progress: number;
        chunkCount: number;
        ragflowDocId: string | null;
        progressMsg: string;
    }> {
        const query = `
            query EmbeddingStatus($id: String!) {
                embeddingStatus(id: $id) {
                    status
                    progress
                    chunkCount
                    ragflowDocId
                    progressMsg
                }
            }
        `;

        try {
            const data = await graphqlRequest<{ embeddingStatus: any }>(query, { id });
            return data.embeddingStatus;
        } catch (error) {
            console.error("[mediaService] Error getting embedding status:", error);
            return { status: 'error', progress: 0, chunkCount: 0, ragflowDocId: null, progressMsg: 'Failed to fetch status' };
        }
    },

    async autoLabelMedia(id: string): Promise<string[]> {
        const mutation = `
            mutation AutoLabelMedia($id: String!) {
                autoLabelMedia(id: $id)
            }
        `;

        try {
            const data = await graphqlRequest<{ autoLabelMedia: string[] }>(mutation, { id });
            return data.autoLabelMedia || [];
        } catch (error) {
            console.error("Error auto-labeling:", error);
            return [];
        }
    },

    async sendToLabelStudio(id: string, url: string): Promise<boolean> {
        console.warn("sendToLabelStudio not yet implemented");
        return true;
    },

    async chatWithSources(query: string, sourceIds: string[]): Promise<string> {
        console.warn("chatWithSources not yet implemented");
        return "AI Chat is currently a placeholder.";
    },

    async generateReport(query: string, sourceIds: string[]): Promise<string> {
        console.warn("generateReport not yet implemented");
        return "Report generation is a placeholder.";
    },

    async generatePresentation(query: string, sourceIds: string[]): Promise<string> {
        console.warn("generatePresentation not yet implemented");
        return "Presentation generation is a placeholder.";
    },

    async generateImage(prompt: string): Promise<string> {
        console.warn("generateImage not yet implemented");
        return ""; // Return empty string or base64 placeholer
    },

    async generatePodcastScript(sourceIds: string[]): Promise<string> {
        console.warn("generatePodcastScript not yet implemented");
        return JSON.stringify([{ speaker: "Host A", text: "Welcome to the podcast." }, { speaker: "Host B", text: "Thanks for having me." }]);
    },

};

export default mediaService;
