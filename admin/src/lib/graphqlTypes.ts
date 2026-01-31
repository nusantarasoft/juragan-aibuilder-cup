/**
 * TypeScript Types for GraphQL API
 */

// Auth Types
export interface User {
    id: string;
    email: string;
    fullName?: string;
    role: string;
    createdAt?: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export interface SignOutResponse {
    success: boolean;
}

// Page Types
export interface Page {
    id: string;
    title: string;
    slug: string;
    content?: PageBlock[];
    status: 'draft' | 'published';
    metaTitle?: string;
    metaDescription?: string;
    authorId?: string;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
}

export interface PageBlock {
    id: string;
    type: string;
    props: Record<string, unknown>;
    styles?: Record<string, unknown>;
    children?: PageBlock[];
}

export interface CreatePageInput {
    title: string;
    slug?: string;
    content?: PageBlock[];
    status?: 'draft' | 'published';
    metaTitle?: string;
    metaDescription?: string;
}

export interface UpdatePageInput {
    title?: string;
    slug?: string;
    content?: PageBlock[];
    status?: 'draft' | 'published';
    metaTitle?: string;
    metaDescription?: string;
}

// Media Types (using snake_case for backward compatibility)
export interface MediaFile {
    id: string;
    filename: string;
    original_name?: string;
    url: string;
    s3_key?: string;
    mime_type?: string;
    size_bytes?: number;
    alt_text?: string;
    uploaded_by?: string;
    embedding?: string;
    created_at: string;
    updated_at?: string;
    metadata?: any;
    bucket_name?: string;
    checksum?: string;
    thumbnail_path?: string;
    thumbnailUrl?: string;
    previewPages?: string[];
}

export interface UploadFileInput {
    file: File;
    altText?: string;
}

// Settings Types
export interface Settings {
    id: string;
    key: string;
    value: string;
    category?: string;
}

// Generic Response Types
export interface SuccessResponse {
    success: boolean;
}
