import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface User {
    id: string;
    email: string;
    name?: string;
    role?: string;
    createdAt?: string;
    updatedAt?: string;
}

@Injectable()
export class UsersService {
    constructor(private supabaseService: SupabaseService) { }

    async findAll(): Promise<User[]> {
        const { data, error } = await this.supabaseService
            .getAdminClient()
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return (data || []).map(this.mapUser);
    }

    async findById(id: string): Promise<User | null> {
        const { data, error } = await this.supabaseService
            .getAdminClient()
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw new Error(error.message);
        }

        return this.mapUser(data);
    }

    async update(id: string, updates: Partial<User>): Promise<User> {
        const { data, error } = await this.supabaseService
            .getAdminClient()
            .from('users')
            .update({
                name: updates.name,
                role: updates.role,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(error.message);
        }

        return this.mapUser(data);
    }

    async delete(id: string): Promise<boolean> {
        const { error } = await this.supabaseService
            .getAdminClient()
            .from('users')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(error.message);
        }

        return true;
    }

    private mapUser(data: any): User {
        return {
            id: data.id,
            email: data.email,
            name: data.name,
            role: data.role,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    }
}
