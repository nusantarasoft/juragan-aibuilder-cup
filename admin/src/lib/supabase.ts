/**
 * Legacy Types - For backward compatibility only
 * 
 * DEPRECATED: This file is kept for backward compatibility.
 * Use types from ./graphqlTypes.ts for new code.
 * 
 * The Supabase client has been removed.
 * All data access should go through GraphQL middleware.
 */

// Types for CMS (legacy format with snake_case)
export interface UserProfile {
    id: string;
    email: string;
    full_name?: string;
    role: string;
    two_factor_enabled: boolean;
    two_factor_secret?: string;
    created_at: string;
}

export interface CMSPage {
    id: string;
    title: string;
    slug: string;
    content: PageBuilderBlock[];
    status: "draft" | "published";
    author_id: string;
    meta_title?: string;
    meta_description?: string;
    created_at: string;
    updated_at: string;
    published_at?: string;
}

export interface PageBuilderBlock {
    id: string;
    type: string;
    props: Record<string, unknown>;
    styles?: Record<string, unknown>;
    children?: PageBuilderBlock[];
}

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
}

/**
 * @deprecated Supabase client removed. Use GraphQL via graphqlClient.ts
 */
export const supabase = null as never;

/**
 * @deprecated Supabase client removed. Use GraphQL via graphqlClient.ts
 */
export const getSupabase = () => {
    throw new Error("Supabase client removed. Use GraphQL via graphqlClient.ts");
};
