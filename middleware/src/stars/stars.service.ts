import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface UserStar {
    id: string;
    userId: string;
    path: string;
    name: string;
    icon?: string;
    createdAt?: string;
}

@Injectable()
export class StarsService {
    constructor(private supabaseService: SupabaseService) { }

    async findAll(userId: string): Promise<UserStar[]> {
        const { data, error } = await this.supabaseService
            .getAdminClient()
            .from('user_stars')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return (data || []).map(this.mapStar);
    }

    async toggle(userId: string, input: { path: string; name: string; icon?: string }): Promise<UserStar | null> {
        // Check if exists
        const { data: existing } = await this.supabaseService
            .getAdminClient()
            .from('user_stars')
            .select('id')
            .eq('user_id', userId)
            .eq('path', input.path)
            .single();

        if (existing) {
            // Delete if exists
            const { error } = await this.supabaseService
                .getAdminClient()
                .from('user_stars')
                .delete()
                .eq('id', existing.id);

            if (error) throw new Error(error.message);
            return null;
        } else {
            // Insert if not exists
            const { data, error } = await this.supabaseService
                .getAdminClient()
                .from('user_stars')
                .insert({
                    user_id: userId,
                    path: input.path,
                    name: input.name,
                    icon: input.icon,
                })
                .select()
                .single();

            if (error) throw new Error(error.message);
            return this.mapStar(data);
        }
    }

    private mapStar(data: any): UserStar {
        return {
            id: data.id,
            userId: data.user_id,
            path: data.path,
            name: data.name,
            icon: data.icon,
            createdAt: data.created_at,
        };
    }
}
