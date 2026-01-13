/**
 * Media Service - All operations via GraphQL Middleware
 * No direct S3 access from frontend - all S3 ops go through middleware
 */

import type { MediaFile } from "./graphqlTypes";

// Re-export MediaFile type for backward compatibility
export type { MediaFile };

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
const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4001/graphql';

async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
    });
    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
}

// GraphQL returns camelCase, we need snake_case for backward compatibility
interface GraphQLMediaFile {
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
}

// Convert internal minio:9000 URLs to browser-accessible localhost:9000 URLs
function normalizeMinioUrl(url: string | undefined): string | undefined {
    if (!url) return url;
    // Replace Docker internal hostname with localhost for browser access
    return url.replace(/http:\/\/minio:9000/g, 'http://localhost:9000');
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
        uploaded_by: gql.uploadedBy,
        embedding: gql.embedding,
        created_at: gql.createdAt,
        updated_at: gql.updatedAt,
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
        options?: { folder?: string; bucket?: string; altText?: string; autoLabel?: boolean; generateEmbedding?: boolean }
    ): Promise<{ success: boolean; media?: MediaFile; error?: string }> {
        try {
            // Use GraphQL multipart upload
            const formData = new FormData();

            const operations = JSON.stringify({
                query: `
                    mutation UploadFile($file: Upload!, $folder: String, $bucket: String, $altText: String, $autoLabel: Boolean, $generateEmbedding: Boolean) {
                        uploadFile(file: $file, folder: $folder, bucket: $bucket, altText: $altText, autoLabel: $autoLabel, generateEmbedding: $generateEmbedding) {
                            id
                            filename
                            url
                            mimeType
                            sizeBytes
                            s3Key
                        }
                    }
                `,
                variables: {
                    file: null,
                    folder: options?.folder || 'uploads',
                    bucket: options?.bucket, // Pass bucket
                    altText: options?.altText || file.name,
                    autoLabel: options?.autoLabel,
                    generateEmbedding: options?.generateEmbedding,
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

            return { success: true, media: mapToMediaFile(json.data.uploadFile) };
        } catch (error: unknown) {
            console.error("Error uploading media:", error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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
    }): Promise<MediaFile[]> {
        const query = `
            query Media($limit: Int, $offset: Int, $mimeType: String) {
                media(limit: $limit, offset: $offset, mimeType: $mimeType) {
                    id
                    filename
                    originalName
                    url
                    s3Key
                    mimeType
                    sizeBytes
                    altText
                    createdAt
                }
            }
        `;

        try {
            const data = await graphqlRequest<{ media: GraphQLMediaFile[] }>(query, {
                limit: options?.limit,
                offset: options?.offset,
                mimeType: options?.mimeType,
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
        updates: Partial<Pick<MediaFile, "alt_text" | "filename">>
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
                input: { altText: updates.alt_text, filename: updates.filename },
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
            return data.listFolders || [];
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
            const data = await graphqlRequest<{ createFolder: boolean }>(mutation, { path, bucket });
            return data.createFolder;
        } catch (error) {
            console.error("Error creating folder:", error);
            return false;
        }
    },

    async deleteFolder(path: string): Promise<boolean> {
        const mutation = `
            mutation DeleteFolder($path: String!) {
                deleteFolder(path: $path)
            }
        `;

        try {
            const data = await graphqlRequest<{ deleteFolder: boolean }>(mutation, { path });
            return data.deleteFolder;
        } catch (error) {
            console.error("Error deleting folder:", error);
            return false;
        }
    },

    async moveFile(sourceKey: string, destKey: string): Promise<boolean> {
        const mutation = `
            mutation MoveFile($sourceKey: String!, $destKey: String!) {
                moveFile(sourceKey: $sourceKey, destKey: $destKey)
            }
        `;

        try {
            const data = await graphqlRequest<{ moveFile: boolean }>(mutation, { sourceKey, destKey });
            return data.moveFile;
        } catch (error) {
            console.error("Error moving file:", error);
            return false;
        }
    },

    async copyFile(sourceKey: string, destKey: string): Promise<boolean> {
        const mutation = `
            mutation CopyFile($sourceKey: String!, $destKey: String!) {
                copyFile(sourceKey: $sourceKey, destKey: $destKey)
            }
        `;

        try {
            const data = await graphqlRequest<{ copyFile: boolean }>(mutation, { sourceKey, destKey });
            return data.copyFile;
        } catch (error) {
            console.error("Error copying file:", error);
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
            const data = await graphqlRequest<{ listBuckets: S3Bucket[] }>(query);
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
            const data = await graphqlRequest<{ createBucket: boolean }>(mutation, { name });
            return data.createBucket;
        } catch (error) {
            console.error("Error creating bucket:", error);
            return false;
        }
    },

    async deleteBucket(name: string): Promise<boolean> {
        const mutation = `
            mutation DeleteBucket($name: String!) {
                deleteBucket(name: $name)
            }
        `;

        try {
            const data = await graphqlRequest<{ deleteBucket: boolean }>(mutation, { name });
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

    async getStorageStats(): Promise<StorageStats | null> {
        const query = `
            query GetStorageStats {
                getStorageStats {
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
            const data = await graphqlRequest<{ getStorageStats: StorageStats }>(query);
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
            return 'http://localhost:9000';
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

    // ═══════════════════════════════════════════════════════════════════════════
    // AI OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    async generateMediaEmbeddings(mediaId: string, content: string): Promise<boolean> {
        const mutation = `
            mutation GenerateMediaEmbeddings($mediaId: String!, $content: String!) {
                generateMediaEmbeddings(mediaId: $mediaId, content: $content)
            }
        `;

        try {
            const data = await graphqlRequest<{ generateMediaEmbeddings: boolean }>(mutation, { mediaId, content });
            return data.generateMediaEmbeddings;
        } catch (error) {
            console.error("Error generating embeddings:", error);
            return false;
        }
    },

    async sendToLabelStudio(mediaId: string, mediaUrl: string): Promise<boolean> {
        const mutation = `
            mutation SendToLabelStudio($mediaId: String!, $mediaUrl: String!) {
                sendToLabelStudio(mediaId: $mediaId, mediaUrl: $mediaUrl)
            }
        `;

        try {
            const data = await graphqlRequest<{ sendToLabelStudio: boolean }>(mutation, { mediaId, mediaUrl });
            return data.sendToLabelStudio;
        } catch (error) {
            console.error("Error sending to Label Studio:", error);
            return false;
        }
    },

    async autoLabelMedia(mediaId: string): Promise<string[]> {
        const mutation = `
            mutation AutoLabelMedia($mediaId: String!) {
                autoLabelMedia(mediaId: $mediaId)
            }
        `;
        try {
            const data = await graphqlRequest<{ autoLabelMedia: string[] }>(mutation, { mediaId });
            return data.autoLabelMedia;
        } catch (error) {
            console.error("Error auto-labeling media:", error);
            return [];
        }
    },

    async chatWithSources(query: string, mediaIds: string[]): Promise<string> {
        const mutation = `
            mutation ChatWithSources($query: String!, $mediaIds: [String!]!) {
                chatWithSources(query: $query, mediaIds: $mediaIds)
            }
        `;
        try {
            const data = await graphqlRequest<{ chatWithSources: string }>(mutation, { query, mediaIds });
            return data.chatWithSources;
        } catch (error) {
            console.error("Error chatting with sources:", error);
            return "Error: Could not communicate with AI service.";
        }
    },

    async generateReport(query: string, mediaIds: string[]): Promise<string> {
        const mutation = `
            mutation GenerateReport($query: String!, $mediaIds: [String!]!) {
                generateReport(query: $query, mediaIds: $mediaIds)
            }
        `;
        try {
            const data = await graphqlRequest<{ generateReport: string }>(mutation, { query, mediaIds });
            return data.generateReport;
        } catch (error) {
            console.error("Error generating report:", error);
            return "Error: Could not generate report.";
        }
    },

    async generatePresentation(query: string, mediaIds: string[]): Promise<string> {
        const mutation = `
            mutation GeneratePresentation($query: String!, $mediaIds: [String!]!) {
                generatePresentation(query: $query, mediaIds: $mediaIds)
            }
        `;
        try {
            const data = await graphqlRequest<{ generatePresentation: string }>(mutation, { query, mediaIds });
            return data.generatePresentation;
        } catch (error) {
            console.error("Error generating presentation:", error);
            return "[]";
        }
    },

    async generateImage(prompt: string): Promise<string> {
        const mutation = `
            mutation GenerateImage($prompt: String!) {
                generateImage(prompt: $prompt)
            }
        `;
        try {
            const data = await graphqlRequest<{ generateImage: string }>(mutation, { prompt });
            return data.generateImage;
        } catch (error) {
            console.error("Error generating image:", error);
            return "";
        }
    },
    async generatePodcastScript(mediaIds: string[]): Promise<string> {
        const mutation = `
            mutation GeneratePodcastScript($mediaIds: [String!]!) {
                generatePodcastScript(mediaIds: $mediaIds)
            }
        `;
        try {
            const data = await graphqlRequest<{ generatePodcastScript: string }>(mutation, { mediaIds });
            return data.generatePodcastScript;
        } catch (error) {
            console.error("Error generating podcast script:", error);
            return "[]";
        }
    },
};

export default mediaService;
