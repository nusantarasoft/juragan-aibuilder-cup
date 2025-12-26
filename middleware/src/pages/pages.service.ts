import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface Page {
    id: string;
    title: string;
    slug: string;
    content?: string;
    status: string;
    authorId?: string;
    createdAt?: string;
    updatedAt?: string;
    publishedAt?: string;
    // SEO Fields
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
    ogTitle?: string;
    ogDescription?: string;
}


export interface CreatePageInput {
    title: string;
    slug: string;
    content?: string;
    status?: string;
}

export interface UpdatePageInput {
    title?: string;
    slug?: string;
    content?: string;
    status?: string;
}

@Injectable()
export class PagesService {
    constructor(private supabaseService: SupabaseService) { }

    async findAll(status?: string): Promise<Page[]> {
        let query = this.supabaseService
            .getAdminClient()
            .from('pages')
            .select('*')
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(error.message);
        }

        return (data || []).map(this.mapPage);
    }

    async findById(id: string): Promise<Page | null> {
        const { data, error } = await this.supabaseService
            .getAdminClient()
            .from('pages')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw new Error(error.message);
        }

        return this.mapPage(data);
    }

    async findBySlug(slug: string): Promise<Page | null> {
        const { data, error } = await this.supabaseService
            .getAdminClient()
            .from('pages')
            .select('*')
            .eq('slug', slug)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw new Error(error.message);
        }

        return this.mapPage(data);
    }

    async create(input: CreatePageInput, authorId?: string): Promise<Page> {
        const { data, error } = await this.supabaseService
            .getAdminClient()
            .from('pages')
            .insert({
                title: input.title,
                slug: input.slug,
                content: input.content || '',
                status: input.status || 'draft',
                author_id: authorId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            throw new Error(error.message);
        }

        return this.mapPage(data);
    }

    async update(id: string, input: UpdatePageInput): Promise<Page> {
        const updateData: any = {
            updated_at: new Date().toISOString(),
        };

        if (input.title !== undefined) updateData.title = input.title;
        if (input.slug !== undefined) updateData.slug = input.slug;
        if (input.content !== undefined) updateData.content = input.content;
        if (input.status !== undefined) {
            updateData.status = input.status;
            if (input.status === 'published') {
                updateData.published_at = new Date().toISOString();
            }
        }

        const { data, error } = await this.supabaseService
            .getAdminClient()
            .from('pages')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(error.message);
        }

        return this.mapPage(data);
    }

    async delete(id: string): Promise<boolean> {
        const { error } = await this.supabaseService
            .getAdminClient()
            .from('pages')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(error.message);
        }

        return true;
    }

    private mapPage(data: any): Page {
        return {
            id: data.id,
            title: data.title,
            slug: data.slug,
            // JSONB from DB → JSON string for GraphQL
            content: data.content ? JSON.stringify(data.content) : '[]',
            status: data.status,
            authorId: data.author_id,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            publishedAt: data.published_at,
            // SEO Fields (snake_case from DB → camelCase for GraphQL)
            metaTitle: data.meta_title,
            metaDescription: data.meta_description,
            ogImage: data.og_image,
            ogTitle: data.og_title,
            ogDescription: data.og_description,
        };
    }


}
