/**
 * Media Service - File operations via GraphQL Middleware + S3
 * Metadata operations use GraphQL, file uploads use S3 directly
 */

import { uploadToS3, deleteFromS3, getPresignedUrl, generateFileKey, ensureBucketExists } from "./s3Client";
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

// Map camelCase GraphQL response to snake_case MediaFile
function mapToMediaFile(gql: GraphQLMediaFile): MediaFile {
    return {
        id: gql.id,
        filename: gql.filename,
        original_name: gql.originalName,
        url: gql.url,
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

// Media Service - CRUD operations
export const mediaService = {
    // Upload media file (S3 + GraphQL metadata)
    async uploadMedia(
        file: File,
        options?: {
            folder?: string;
            generateEmbedding?: boolean;
            altText?: string;
        }
    ): Promise<UploadResult> {
        try {
            // Ensure bucket exists
            await ensureBucketExists();

            // Read file as buffer
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Generate file key
            const key = generateFileKey(file.name, options?.folder || "uploads");

            // Upload to S3
            const url = await uploadToS3(buffer, key, file.type);

            // Save metadata via GraphQL
            const mutation = `
                mutation UploadMedia($input: UploadMediaInput!) {
                    uploadMedia(uploadMediaInput: $input) {
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

            const data = await graphqlRequest<{ uploadMedia: MediaFile }>(mutation, {
                input: {
                    filename: file.name,
                    originalName: file.name,
                    url,
                    s3Key: key,
                    mimeType: file.type,
                    sizeBytes: file.size,
                    altText: options?.altText || file.name,
                },
            });

            return { success: true, media: data.uploadMedia };
        } catch (error: unknown) {
            console.error("Error uploading media:", error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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

    // Get presigned URL for private access
    async getMediaUrl(key: string): Promise<string> {
        return getPresignedUrl(key);
    },

    // Delete media file
    async deleteMedia(id: string): Promise<boolean> {
        const mutation = `
            mutation DeleteMedia($id: ID!) {
                deleteMedia(id: $id) {
                    success
                    s3Key
                }
            }
        `;

        try {
            const data = await graphqlRequest<{ deleteMedia: { success: boolean; s3Key?: string } }>(
                mutation,
                { id }
            );

            // Delete from S3 if key returned
            if (data.deleteMedia.s3Key) {
                await deleteFromS3(data.deleteMedia.s3Key);
            }

            return data.deleteMedia.success;
        } catch (error) {
            console.error("Error deleting media:", error);
            return false;
        }
    },

    // Search similar media (placeholder - needs middleware implementation)
    async searchSimilar(
        queryEmbedding: number[],
        options?: {
            threshold?: number;
            limit?: number;
        }
    ): Promise<MediaSearchResult[]> {
        // TODO: Implement via GraphQL middleware
        console.warn("searchSimilar not yet implemented via GraphQL");
        return [];
    },

    // Search by text query (placeholder - needs middleware implementation)
    async searchByText(query: string, limit = 10): Promise<MediaSearchResult[]> {
        // TODO: Implement via GraphQL middleware
        console.warn("searchByText not yet implemented via GraphQL");
        return [];
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
};

export default mediaService;
