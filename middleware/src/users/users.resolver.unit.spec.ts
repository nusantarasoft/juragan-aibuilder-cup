import { describe, expect, it, vi } from 'vitest';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';

describe('UsersResolver', () => {
    const actor = { id: 'actor-1', role: 'super_admin' };
    const context = { req: { user: actor } };

    function buildResolver(overrides?: Partial<UsersService>) {
        const usersService = {
            findAll: vi.fn().mockResolvedValue([{ id: 'u1', email: 'a@b.com', role: 'admin', status: 'active' }]),
            findById: vi.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com', role: 'admin', status: 'active' }),
            create: vi.fn().mockResolvedValue({ id: 'u2', email: 'c@d.com', role: 'admin', status: 'active' }),
            update: vi.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com', role: 'admin', status: 'inactive' }),
            setStatus: vi.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com', role: 'admin', status: 'inactive' }),
            delete: vi.fn().mockResolvedValue(true),
            ...overrides,
        } as unknown as UsersService;
        return { resolver: new UsersResolver(usersService), usersService };
    }

    it('users delegates to findAll', async () => {
        const { resolver, usersService } = buildResolver();
        const result = await resolver.users();
        expect(result).toHaveLength(1);
        expect(usersService.findAll).toHaveBeenCalled();
    });

    it('user delegates to findById', async () => {
        const { resolver, usersService } = buildResolver();
        await resolver.user('u1');
        expect(usersService.findById).toHaveBeenCalledWith('u1');
    });

    it('createUser passes actor role', async () => {
        const { resolver, usersService } = buildResolver();
        const input = { email: 'c@d.com', password: 'Password123!', fullName: 'C', role: 'admin' };
        await resolver.createUser(input, context);
        expect(usersService.create).toHaveBeenCalledWith(input, 'super_admin');
    });

    it('updateUser passes actor role and id', async () => {
        const { resolver, usersService } = buildResolver();
        await resolver.updateUser('u1', { fullName: 'X' }, context);
        expect(usersService.update).toHaveBeenCalledWith('u1', { fullName: 'X' }, 'super_admin', 'actor-1');
    });

    it('setUserStatus normalizes inactive and active', async () => {
        const { resolver, usersService } = buildResolver();
        await resolver.setUserStatus('u1', 'inactive', context);
        expect(usersService.setStatus).toHaveBeenCalledWith('u1', 'inactive', 'super_admin', 'actor-1');

        await resolver.setUserStatus('u1', 'ACTIVE', context);
        expect(usersService.setStatus).toHaveBeenCalledWith('u1', 'active', 'super_admin', 'actor-1');
    });

    it('deleteUser passes actor id', async () => {
        const { resolver, usersService } = buildResolver();
        await expect(resolver.deleteUser('u1', context)).resolves.toBe(true);
        expect(usersService.delete).toHaveBeenCalledWith('u1', 'actor-1');
    });
});
