import { describe, expect, it, vi, afterEach } from 'vitest';
import { mutations, queries, graphql } from '@/lib/graphqlClient';

describe('graphqlClient user management documents', () => {
    it('users query requests role and status fields', () => {
        expect(queries.users).toContain('fullName');
        expect(queries.users).toContain('status');
        expect(queries.user).toContain('role');
    });

    it('exposes create/update/status/delete mutations with input args', () => {
        expect(mutations.createUser).toContain('createUser(input: $input)');
        expect(mutations.updateUser).toContain('updateUser(id: $id, input: $input)');
        expect(mutations.setUserStatus).toContain('setUserStatus(id: $id, status: $status)');
        expect(mutations.deleteUser).toContain('deleteUser(id: $id)');
        expect(mutations.deleteUser).not.toContain('{ success }');
    });
});

describe('user management GraphQL contract (mocked fetch)', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('lists users with bearer authorization header', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            json: async () => ({
                data: {
                    users: [
                        {
                            id: 'u1',
                            email: 'admin@nusantarasoft.local',
                            fullName: 'Admin',
                            role: 'super_admin',
                            status: 'active',
                        },
                    ],
                },
            }),
        });
        globalThis.fetch = fetchMock as unknown as typeof fetch;

        const data = await graphql<{ users: Array<{ id: string; role: string }> }>(queries.users, {
            token: 'test-token',
        });
        expect(data.users[0]).toMatchObject({ id: 'u1', role: 'super_admin' });

        const init = fetchMock.mock.calls[0][1] as RequestInit;
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
        expect(JSON.parse(String(init.body)).query).toContain('users');
    });
});
