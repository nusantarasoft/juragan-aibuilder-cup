import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface Setting {
    id: string;
    key: string;
    value: string;
    category?: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSettingInput {
    key: string;
    value: string;
    category?: string;
    description?: string;
}

export interface UpdateSettingInput {
    value?: string;
    category?: string;
    description?: string;
}

@Injectable()
export class SettingsService {
    constructor(private readonly supabase: SupabaseService) { }

    async findAll(): Promise<Setting[]> {
        const { data, error } = await this.supabase
            .getClient()
            .from('settings')
            .select('*')
            .order('category', { ascending: true })
            .order('key', { ascending: true });

        if (error) {
            console.error('Error fetching settings:', error);
            return [];
        }

        return this.mapSettings(data || []);
    }

    async findByCategory(category: string): Promise<Setting[]> {
        const { data, error } = await this.supabase
            .getClient()
            .from('settings')
            .select('*')
            .eq('category', category)
            .order('key', { ascending: true });

        if (error) {
            console.error('Error fetching settings by category:', error);
            return [];
        }

        return this.mapSettings(data || []);
    }

    async findByKey(key: string): Promise<Setting | null> {
        const { data, error } = await this.supabase
            .getClient()
            .from('settings')
            .select('*')
            .eq('key', key)
            .single();

        if (error) {
            console.error('Error fetching setting:', error);
            return null;
        }

        return this.mapSetting(data);
    }

    async findOne(id: string): Promise<Setting | null> {
        const { data, error } = await this.supabase
            .getClient()
            .from('settings')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching setting:', error);
            return null;
        }

        return this.mapSetting(data);
    }

    async create(input: CreateSettingInput): Promise<Setting | null> {
        const { data, error } = await this.supabase
            .getClient()
            .from('settings')
            .insert({
                key: input.key,
                value: input.value,
                category: input.category,
                description: input.description,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating setting:', error);
            return null;
        }

        return this.mapSetting(data);
    }

    async update(id: string, input: UpdateSettingInput): Promise<Setting | null> {
        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (input.value !== undefined) updates.value = input.value;
        if (input.category !== undefined) updates.category = input.category;
        if (input.description !== undefined) updates.description = input.description;

        const { data, error } = await this.supabase
            .getClient()
            .from('settings')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating setting:', error);
            return null;
        }

        return this.mapSetting(data);
    }

    async updateByKey(key: string, value: string): Promise<Setting | null> {
        const { data, error } = await this.supabase
            .getClient()
            .from('settings')
            .update({ value, updated_at: new Date().toISOString() })
            .eq('key', key)
            .select()
            .single();

        if (error) {
            console.error('Error updating setting by key:', error);
            return null;
        }

        return this.mapSetting(data);
    }

    async delete(id: string): Promise<boolean> {
        const { error } = await this.supabase
            .getClient()
            .from('settings')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting setting:', error);
            return false;
        }

        return true;
    }

    private mapSetting(data: Record<string, unknown>): Setting {
        return {
            id: data.id as string,
            key: data.key as string,
            value: data.value as string,
            category: data.category as string | undefined,
            description: data.description as string | undefined,
            createdAt: data.created_at as string,
            updatedAt: data.updated_at as string,
        };
    }

    private mapSettings(data: Record<string, unknown>[]): Setting[] {
        return data.map((item) => this.mapSetting(item));
    }
}
