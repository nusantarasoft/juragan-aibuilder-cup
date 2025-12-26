import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface Block {
    id: string;
    name: string;
    type: string;
    category: string;
    icon?: string;
    defaultProps?: Record<string, unknown>;
    schema?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface CreateBlockInput {
    name: string;
    type: string;
    category: string;
    icon?: string;
    defaultProps?: Record<string, unknown>;
    schema?: Record<string, unknown>;
}

export interface UpdateBlockInput {
    name?: string;
    type?: string;
    category?: string;
    icon?: string;
    defaultProps?: Record<string, unknown>;
    schema?: Record<string, unknown>;
}

@Injectable()
export class BlocksService {
    constructor(private readonly supabase: SupabaseService) { }

    async findAll(): Promise<Block[]> {
        const { data, error } = await this.supabase
            .getClient()
            .from('blocks')
            .select('*')
            .order('category', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching blocks:', error);
            return [];
        }

        return this.mapBlocks(data || []);
    }

    async findByCategory(category: string): Promise<Block[]> {
        const { data, error } = await this.supabase
            .getClient()
            .from('blocks')
            .select('*')
            .eq('category', category)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching blocks by category:', error);
            return [];
        }

        return this.mapBlocks(data || []);
    }

    async findOne(id: string): Promise<Block | null> {
        const { data, error } = await this.supabase
            .getClient()
            .from('blocks')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching block:', error);
            return null;
        }

        return this.mapBlock(data);
    }

    async create(input: CreateBlockInput): Promise<Block | null> {
        const { data, error } = await this.supabase
            .getClient()
            .from('blocks')
            .insert({
                name: input.name,
                type: input.type,
                category: input.category,
                icon: input.icon,
                default_props: input.defaultProps,
                schema: input.schema,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating block:', error);
            return null;
        }

        return this.mapBlock(data);
    }

    async update(id: string, input: UpdateBlockInput): Promise<Block | null> {
        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (input.name !== undefined) updates.name = input.name;
        if (input.type !== undefined) updates.type = input.type;
        if (input.category !== undefined) updates.category = input.category;
        if (input.icon !== undefined) updates.icon = input.icon;
        if (input.defaultProps !== undefined) updates.default_props = input.defaultProps;
        if (input.schema !== undefined) updates.schema = input.schema;

        const { data, error } = await this.supabase
            .getClient()
            .from('blocks')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating block:', error);
            return null;
        }

        return this.mapBlock(data);
    }

    async delete(id: string): Promise<boolean> {
        const { error } = await this.supabase
            .getClient()
            .from('blocks')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting block:', error);
            return false;
        }

        return true;
    }

    private mapBlock(data: Record<string, unknown>): Block {
        return {
            id: data.id as string,
            name: data.name as string,
            type: data.type as string,
            category: data.category as string,
            icon: data.icon as string | undefined,
            defaultProps: data.default_props as Record<string, unknown> | undefined,
            schema: data.schema as Record<string, unknown> | undefined,
            createdAt: data.created_at as string,
            updatedAt: data.updated_at as string,
        };
    }

    private mapBlocks(data: Record<string, unknown>[]): Block[] {
        return data.map((item) => this.mapBlock(item));
    }
}
