import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
    DEFAULT_APP_ROLE,
    isAppRole,
    normalizeAppRole,
    normalizeUserStatus,
    type AppRole,
    type UserStatus,
} from '../auth/app-roles';

export interface ManagedUser {
    id: string;
    email: string;
    fullName?: string;
    role: AppRole;
    status: UserStatus;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateManagedUserInput {
    email: string;
    password: string;
    fullName?: string;
    role?: string;
}

export interface UpdateManagedUserInput {
    fullName?: string;
    role?: string;
    status?: string;
    password?: string;
}

const LEGACY_ROLE_ALIASES = new Set([
    'manager',
    'viewer',
    'guest',
    'authenticated',
    'editor',
    'service_role',
    'supabase_admin',
]);

/* v8 ignore start */
@Injectable()
export class UsersService {
/* v8 ignore stop */
    constructor(private supabaseService: SupabaseService) {}

    private get db() {
        return this.supabaseService.getAdminClient();
    }

    private mapUser(data: any): ManagedUser {
        return {
            id: data.id,
            email: data.email,
            fullName: data.full_name ?? undefined,
            role: normalizeAppRole(data.role),
            status: normalizeUserStatus(data.status),
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    }

    private assertValidRole(role?: string | null): AppRole {
        if (role == null || role === '') return DEFAULT_APP_ROLE;
        const raw = role.toLowerCase().replace(/[\s-]/g, '_');
        if (isAppRole(raw) || LEGACY_ROLE_ALIASES.has(raw)) {
            return normalizeAppRole(raw);
        }
        throw new BadRequestException(`Invalid role "${role}". Allowed: super_admin, admin`);
    }

    private assertCanAssignRole(actorRole: string, targetRole: AppRole): void {
        if (targetRole === 'super_admin' && normalizeAppRole(actorRole) !== 'super_admin') {
            throw new ForbiddenException('Only super_admin can assign the super_admin role');
        }
    }

    async findAll(): Promise<ManagedUser[]> {
        const { data, error } = await this.db
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return (data || []).map((row) => this.mapUser(row));
    }

    async findById(id: string): Promise<ManagedUser | null> {
        const { data, error } = await this.db
            .from('user_profiles')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            throw new Error(error.message);
        }

        return data ? this.mapUser(data) : null;
    }

    async create(input: CreateManagedUserInput, actorRole: string): Promise<ManagedUser> {
        const email = input.email?.trim().toLowerCase();
        if (!email) {
            throw new BadRequestException('Email is required');
        }
        if (!input.password || input.password.length < 8) {
            throw new BadRequestException('Password must be at least 8 characters');
        }

        const role = this.assertValidRole(input.role);
        this.assertCanAssignRole(actorRole, role);

        const { data: created, error: createError } = await this.db.auth.admin.createUser({
            email,
            password: input.password,
            email_confirm: true,
            user_metadata: { full_name: input.fullName || email.split('@')[0] },
        });

        if (createError) {
            throw new BadRequestException(createError.message);
        }
        if (!created.user) {
            throw new BadRequestException('Failed to create auth user');
        }

        const now = new Date().toISOString();
        const { data: profile, error: profileError } = await this.db
            .from('user_profiles')
            .upsert({
                id: created.user.id,
                email,
                full_name: input.fullName || email.split('@')[0],
                role,
                status: 'active',
                updated_at: now,
            })
            .select('*')
            .single();

        if (profileError) {
            await this.db.auth.admin.deleteUser(created.user.id).catch(() => undefined);
            throw new Error(profileError.message);
        }

        return this.mapUser(profile);
    }

    async update(
        id: string,
        updates: UpdateManagedUserInput,
        actorRole: string,
        actorId?: string,
    ): Promise<ManagedUser> {
        const existing = await this.findById(id);
        if (!existing) {
            throw new NotFoundException(`User ${id} not found`);
        }

        const patch: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (updates.fullName !== undefined) {
            patch.full_name = updates.fullName;
        }

        if (updates.role !== undefined) {
            const role = this.assertValidRole(updates.role);
            this.assertCanAssignRole(actorRole, role);
            if (existing.role === 'super_admin' && role !== 'super_admin' && actorId === id) {
                throw new ForbiddenException('You cannot demote your own super_admin role');
            }
            patch.role = role;
        }

        if (updates.status !== undefined) {
            const raw = String(updates.status).toLowerCase();
            if (raw !== 'active' && raw !== 'inactive') {
                throw new BadRequestException('Status must be active or inactive');
            }
            const status = normalizeUserStatus(raw);
            if (status === 'inactive' && actorId === id) {
                throw new ForbiddenException('You cannot deactivate your own account');
            }
            patch.status = status;
        }

        const { data, error } = await this.db
            .from('user_profiles')
            .update(patch)
            .eq('id', id)
            .select('*')
            .single();

        if (error) {
            throw new Error(error.message);
        }

        if (updates.password !== undefined) {
            if (!updates.password || updates.password.length < 8) {
                throw new BadRequestException('Password must be at least 8 characters');
            }
            const { error: pwError } = await this.db.auth.admin.updateUserById(id, {
                password: updates.password,
            });
            if (pwError) {
                throw new BadRequestException(pwError.message);
            }
        }

        return this.mapUser(data);
    }

    async setStatus(id: string, status: UserStatus, actorRole: string, actorId?: string): Promise<ManagedUser> {
        return this.update(id, { status }, actorRole, actorId);
    }

    async delete(id: string, actorId?: string): Promise<boolean> {
        if (actorId && actorId === id) {
            throw new ForbiddenException('You cannot delete your own account');
        }

        const existing = await this.findById(id);
        if (!existing) {
            throw new NotFoundException(`User ${id} not found`);
        }

        const { error } = await this.db.auth.admin.deleteUser(id);
        if (error) {
            throw new Error(error.message);
        }

        return true;
    }
}
