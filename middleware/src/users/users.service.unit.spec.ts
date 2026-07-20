import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { SupabaseService } from '../supabase/supabase.service';

type ProfileRow = {
    id: string;
    email: string;
    full_name?: string;
    role: string;
    status: string;
    created_at?: string;
    updated_at?: string;
};

function buildUsersService(options?: {
    list?: ProfileRow[] | null;
    listError?: string;
    byId?: ProfileRow | null;
    byIdError?: string;
    upsert?: ProfileRow | null;
    upsertError?: string;
    update?: ProfileRow | null;
    updateError?: string;
    createAuthUser?: { id: string } | null;
    createAuthError?: string;
    deleteAuthError?: string;
    updateAuthError?: string;
}) {
    const opts = options ?? {};

    const listQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
            data: opts.listError ? null : (opts.list === undefined ? [] : opts.list),
            error: opts.listError ? { message: opts.listError } : null,
        }),
    };

    const byIdQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
            data: opts.byIdError ? null : (opts.byId ?? null),
            error: opts.byIdError ? { message: opts.byIdError } : null,
        }),
    };

    const upsertQuery = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
            data: opts.upsertError ? null : opts.upsert,
            error: opts.upsertError ? { message: opts.upsertError } : null,
        }),
    };

    const updateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
            data: opts.updateError ? null : opts.update,
            error: opts.updateError ? { message: opts.updateError } : null,
        }),
    };

    const from = vi.fn((table: string) => {
        if (table !== 'user_profiles') throw new Error(`unexpected table ${table}`);
        // Route by call pattern: findAll uses order, findById uses maybeSingle,
        // create uses upsert, update uses update.
        return {
            select: (...args: unknown[]) => {
                // After select, either order (list) or eq (by id)
                const chain = {
                    order: listQuery.order,
                    eq: (...eqArgs: unknown[]) => {
                        byIdQuery.eq(...eqArgs);
                        return {
                            maybeSingle: byIdQuery.maybeSingle,
                        };
                    },
                };
                listQuery.select(...args);
                byIdQuery.select(...args);
                return chain;
            },
            upsert: (...args: unknown[]) => {
                upsertQuery.upsert(...args);
                return {
                    select: (...sArgs: unknown[]) => {
                        upsertQuery.select(...sArgs);
                        return { single: upsertQuery.single };
                    },
                };
            },
            update: (...args: unknown[]) => {
                updateQuery.update(...args);
                return {
                    eq: (...eqArgs: unknown[]) => {
                        updateQuery.eq(...eqArgs);
                        return {
                            select: (...sArgs: unknown[]) => {
                                updateQuery.select(...sArgs);
                                return { single: updateQuery.single };
                            },
                        };
                    },
                };
            },
        };
    });

    const authAdmin = {
        createUser: vi.fn().mockResolvedValue({
            data: { user: opts.createAuthUser === null ? null : (opts.createAuthUser ?? { id: 'new-1' }) },
            error: opts.createAuthError ? { message: opts.createAuthError } : null,
        }),
        deleteUser: vi.fn().mockResolvedValue({
            data: null,
            error: opts.deleteAuthError ? { message: opts.deleteAuthError } : null,
        }),
        updateUserById: vi.fn().mockResolvedValue({
            data: { user: { id: 'u1' } },
            error: opts.updateAuthError ? { message: opts.updateAuthError } : null,
        }),
    };

    const supabaseMock = {
        getAdminClient: () => ({
            from,
            auth: { admin: authAdmin },
        }),
    } as unknown as SupabaseService;

    return {
        service: new UsersService(supabaseMock),
        from,
        authAdmin,
        upsertQuery,
        updateQuery,
    };
}

const sample: ProfileRow = {
    id: 'u1',
    email: 'admin@nusantarasoft.local',
    full_name: 'Admin',
    role: 'admin',
    status: 'active',
    created_at: '2026-01-01',
    updated_at: '2026-01-02',
};

describe('UsersService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('findAll maps user_profiles rows', async () => {
        const { service } = buildUsersService({ list: [sample] });
        const users = await service.findAll();
        expect(users).toEqual([
            {
                id: 'u1',
                email: 'admin@nusantarasoft.local',
                fullName: 'Admin',
                role: 'admin',
                status: 'active',
                createdAt: '2026-01-01',
                updatedAt: '2026-01-02',
            },
        ]);
    });

    it('findAll throws on query error', async () => {
        const { service } = buildUsersService({ listError: 'db down' });
        await expect(service.findAll()).rejects.toThrow('db down');
    });

    it('findById returns null when missing', async () => {
        const { service } = buildUsersService({ byId: null });
        await expect(service.findById('missing')).resolves.toBeNull();
    });

    it('findById returns mapped user', async () => {
        const { service } = buildUsersService({ byId: sample });
        await expect(service.findById('u1')).resolves.toMatchObject({ id: 'u1', role: 'admin' });
    });

    it('findById throws on query error', async () => {
        const { service } = buildUsersService({ byIdError: 'boom' });
        await expect(service.findById('u1')).rejects.toThrow('boom');
    });

    it('create provisions auth user and profile', async () => {
        const createdProfile = {
            ...sample,
            id: 'new-1',
            email: 'new@nusantarasoft.local',
            full_name: 'New User',
            role: 'admin',
        };
        const { service, authAdmin } = buildUsersService({
            createAuthUser: { id: 'new-1' },
            upsert: createdProfile,
        });

        const user = await service.create(
            {
                email: 'New@nusantarasoft.local',
                password: 'Password123!',
                fullName: 'New User',
                role: 'admin',
            },
            'super_admin',
        );

        expect(authAdmin.createUser).toHaveBeenCalled();
        expect(user.email).toBe('new@nusantarasoft.local');
        expect(user.role).toBe('admin');
    });

    it('create rejects short password and missing email', async () => {
        const { service } = buildUsersService();
        await expect(service.create({ email: '', password: 'Password123!' }, 'admin')).rejects.toBeInstanceOf(
            BadRequestException,
        );
        await expect(
            service.create({ email: 'a@b.com', password: 'short' }, 'admin'),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('create rejects invalid role', async () => {
        const { service } = buildUsersService();
        await expect(
            service.create({ email: 'a@b.com', password: 'Password123!', role: 'hacker' }, 'admin'),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('create prevents admin from assigning super_admin', async () => {
        const { service } = buildUsersService();
        await expect(
            service.create(
                { email: 'a@b.com', password: 'Password123!', role: 'super_admin' },
                'admin',
            ),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('create throws when auth admin fails', async () => {
        const { service } = buildUsersService({ createAuthError: 'email taken' });
        await expect(
            service.create({ email: 'a@b.com', password: 'Password123!' }, 'admin'),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('create throws when auth user payload is missing', async () => {
        const { service } = buildUsersService({ createAuthUser: null });
        await expect(
            service.create({ email: 'a@b.com', password: 'Password123!' }, 'admin'),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('create rolls back auth user when profile upsert fails', async () => {
        const { service, authAdmin } = buildUsersService({
            createAuthUser: { id: 'new-1' },
            upsertError: 'profile failed',
        });
        authAdmin.deleteUser.mockRejectedValueOnce(new Error('rollback noise'));
        await expect(
            service.create({ email: 'a@b.com', password: 'Password123!' }, 'admin'),
        ).rejects.toThrow('profile failed');
        expect(authAdmin.deleteUser).toHaveBeenCalledWith('new-1');
    });

    it('create defaults role to admin and name from email', async () => {
        const { service } = buildUsersService({
            createAuthUser: { id: 'new-1' },
            upsert: {
                id: 'new-1',
                email: 'jane@x.com',
                full_name: 'jane',
                role: 'admin',
                status: 'active',
            },
        });
        const user = await service.create({ email: 'jane@x.com', password: 'Password123!' }, 'admin');
        expect(user.fullName).toBe('jane');
        expect(user.role).toBe('admin');
    });

    it('update changes fullName role and status', async () => {
        const { service, updateQuery } = buildUsersService({
            byId: sample,
            update: {
                ...sample,
                full_name: 'Updated',
                role: 'admin',
                status: 'inactive',
            },
        });

        const user = await service.update(
            'u1',
            { fullName: 'Updated', role: 'admin', status: 'inactive' },
            'super_admin',
            'actor-2',
        );

        expect(user.fullName).toBe('Updated');
        expect(user.status).toBe('inactive');
        expect(updateQuery.update).toHaveBeenCalled();
    });

    it('update throws NotFound when user missing', async () => {
        const { service } = buildUsersService({ byId: null });
        await expect(service.update('missing', { fullName: 'X' }, 'admin')).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('update rejects invalid status', async () => {
        const { service } = buildUsersService({ byId: sample });
        await expect(
            service.update('u1', { status: 'banned' }, 'admin', 'actor'),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('update prevents self-deactivation', async () => {
        const { service } = buildUsersService({ byId: sample });
        await expect(
            service.update('u1', { status: 'inactive' }, 'admin', 'u1'),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('update prevents self-demotion from super_admin', async () => {
        const { service } = buildUsersService({
            byId: { ...sample, role: 'super_admin' },
        });
        await expect(
            service.update('u1', { role: 'admin' }, 'super_admin', 'u1'),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('update changes password via auth admin', async () => {
        const { service, authAdmin } = buildUsersService({
            byId: sample,
            update: sample,
        });
        await service.update('u1', { password: 'NewPassword1' }, 'admin', 'actor');
        expect(authAdmin.updateUserById).toHaveBeenCalledWith('u1', { password: 'NewPassword1' });
    });

    it('update rejects short password and auth password errors', async () => {
        const short = buildUsersService({ byId: sample, update: sample });
        await expect(
            short.service.update('u1', { password: 'short' }, 'admin'),
        ).rejects.toBeInstanceOf(BadRequestException);

        const fail = buildUsersService({
            byId: sample,
            update: sample,
            updateAuthError: 'weak password',
        });
        await expect(
            fail.service.update('u1', { password: 'Password123!' }, 'admin'),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('update throws on profile update error', async () => {
        const { service } = buildUsersService({ byId: sample, updateError: 'write failed' });
        await expect(service.update('u1', { fullName: 'X' }, 'admin')).rejects.toThrow('write failed');
    });

    it('setStatus delegates to update', async () => {
        const { service } = buildUsersService({
            byId: sample,
            update: { ...sample, status: 'inactive' },
        });
        const user = await service.setStatus('u1', 'inactive', 'super_admin', 'actor');
        expect(user.status).toBe('inactive');
    });

    it('delete removes auth user', async () => {
        const { service, authAdmin } = buildUsersService({ byId: sample });
        await expect(service.delete('u1', 'actor')).resolves.toBe(true);
        expect(authAdmin.deleteUser).toHaveBeenCalledWith('u1');
    });

    it('delete prevents self-delete and missing users', async () => {
        const self = buildUsersService({ byId: sample });
        await expect(self.service.delete('u1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);

        const missing = buildUsersService({ byId: null });
        await expect(missing.service.delete('x', 'actor')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('delete throws on auth admin error', async () => {
        const { service } = buildUsersService({ byId: sample, deleteAuthError: 'cannot delete' });
        await expect(service.delete('u1', 'actor')).rejects.toThrow('cannot delete');
    });

    it('findAll returns empty array when data is null', async () => {
        const { service } = buildUsersService({ list: null });
        await expect(service.findAll()).resolves.toEqual([]);
    });

    it('maps missing full_name to undefined', async () => {
        const { service } = buildUsersService({
            byId: {
                id: 'u1',
                email: 'a@b.com',
                role: 'admin',
                status: 'active',
            },
        });
        const user = await service.findById('u1');
        expect(user?.fullName).toBeUndefined();
    });

    it('create accepts empty role and defaults to admin', async () => {
        const { service } = buildUsersService({
            createAuthUser: { id: 'new-1' },
            upsert: {
                id: 'new-1',
                email: 'a@b.com',
                full_name: 'a',
                role: 'admin',
                status: 'active',
            },
        });
        const user = await service.create(
            { email: 'a@b.com', password: 'Password123!', role: '' },
            'admin',
        );
        expect(user.role).toBe('admin');
    });
});
