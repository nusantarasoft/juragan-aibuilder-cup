import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

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
    constructor(private readonly supabase: SupabaseService) { }

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
            console.error('Error fetching media:', error);
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
            console.error('Error fetching media:', error);
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
            console.error('Error creating media:', error);
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
            console.error('Error updating media:', error);
            return null;
        }

        return this.mapMediaFile(data);
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
            console.error('Error deleting media:', error);
            return { success: false };
        }

        return { success: true, s3Key: media?.s3_key };
    }

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
        };
    }

    private mapMediaFiles(data: Record<string, unknown>[]): MediaFile[] {
        return data.map((item) => this.mapMediaFile(item));
    }
}
