import { describe, expect, it } from 'vitest';
import {
    authIntegrationCredentials,
    gqlRequest,
    isAuthIntegrationEnabled,
    SIGN_IN_MUTATION,
} from '../auth/auth-test.helpers';

const RUN = isAuthIntegrationEnabled()
    || process.env.RUN_USERS_INTEGRATION === '1'
    || process.env.RUN_USERS_INTEGRATION === 'true';

const creds = authIntegrationCredentials();

const USERS_QUERY = `
    query Users {
        users { id email fullName role status createdAt updatedAt }
    }
`;

const USER_QUERY = `
    query User($id: ID!) {
        user(id: $id) { id email fullName role status }
    }
`;

const CREATE_USER_MUTATION = `
    mutation CreateUser($input: CreateUserInput!) {
        createUser(input: $input) { id email fullName role status }
    }
`;

const UPDATE_USER_MUTATION = `
    mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
        updateUser(id: $id, input: $input) { id email fullName role status }
    }
`;

const SET_STATUS_MUTATION = `
    mutation SetUserStatus($id: ID!, $status: String!) {
        setUserStatus(id: $id, status: $status) { id status }
    }
`;

const DELETE_USER_MUTATION = `
    mutation DeleteUser($id: ID!) {
        deleteUser(id: $id)
    }
`;

describe.skipIf(!RUN)('Users GraphQL integration (live middleware + Supabase)', () => {
    async function signIn() {
        const data = await gqlRequest<{
            signIn: { accessToken: string; user: { id: string; role: string } };
        }>(SIGN_IN_MUTATION, creds);
        return data.signIn;
    }

    it('rejects users query without auth', async () => {
        await expect(gqlRequest(USERS_QUERY)).rejects.toThrow(/auth|unauthorized|required/i);
    });

    it('lists users for authenticated admin', async () => {
        const session = await signIn();
        const data = await gqlRequest<{
            users: Array<{ id: string; email: string; role: string; status: string }>;
        }>(USERS_QUERY, undefined, session.accessToken);

        expect(Array.isArray(data.users)).toBe(true);
        expect(data.users.length).toBeGreaterThan(0);
        for (const user of data.users) {
            expect(['super_admin', 'admin']).toContain(user.role);
            expect(['active', 'inactive']).toContain(user.status);
        }
    });

    it('creates updates deactivates and deletes a managed user', async () => {
        const session = await signIn();
        const stamp = Date.now();
        const email = `user.mgmt.${stamp}@nusantarasoft.local`;

        const created = await gqlRequest<{
            createUser: { id: string; email: string; role: string; status: string; fullName?: string };
        }>(
            CREATE_USER_MUTATION,
            {
                input: {
                    email,
                    password: 'TempPass123!',
                    fullName: 'Managed User',
                    role: 'admin',
                },
            },
            session.accessToken,
        );

        expect(created.createUser.email).toBe(email);
        expect(created.createUser.role).toBe('admin');
        expect(created.createUser.status).toBe('active');

        const fetched = await gqlRequest<{
            user: { id: string; email: string } | null;
        }>(USER_QUERY, { id: created.createUser.id }, session.accessToken);
        expect(fetched.user?.id).toBe(created.createUser.id);

        const updated = await gqlRequest<{
            updateUser: { fullName: string };
        }>(
            UPDATE_USER_MUTATION,
            { id: created.createUser.id, input: { fullName: 'Managed User Updated' } },
            session.accessToken,
        );
        expect(updated.updateUser.fullName).toBe('Managed User Updated');

        const deactivated = await gqlRequest<{
            setUserStatus: { status: string };
        }>(
            SET_STATUS_MUTATION,
            { id: created.createUser.id, status: 'inactive' },
            session.accessToken,
        );
        expect(deactivated.setUserStatus.status).toBe('inactive');

        const deleted = await gqlRequest<{ deleteUser: boolean }>(
            DELETE_USER_MUTATION,
            { id: created.createUser.id },
            session.accessToken,
        );
        expect(deleted.deleteUser).toBe(true);
    });

    it('prevents self-deactivation', async () => {
        const session = await signIn();
        await expect(
            gqlRequest(
                SET_STATUS_MUTATION,
                { id: session.user.id, status: 'inactive' },
                session.accessToken,
            ),
        ).rejects.toThrow(/cannot deactivate your own/i);
    });
});
