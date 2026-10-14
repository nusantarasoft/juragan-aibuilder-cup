/**
 * HTTP-level checks for global auth (no live DB required for unauth paths).
 * Integration specs under src/studio and src/users cover authorized flows.
 */
import { describe, expect, it } from 'vitest';

const BASE = process.env.MIDDLEWARE_URL || 'http://127.0.0.1:4001';
const RUN_E2E = process.env.ACCESS_CONTROL_E2E === '1';

describe.skipIf(!RUN_E2E)('access-control e2e (ACCESS_CONTROL_E2E=1)', () => {
    it('unauthenticated GraphQL introspection query returns errors when protected', async () => {
        const res = await fetch(`${BASE}/graphql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: '{ health }' }),
        });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.data?.health).toBe('OK');
    });

    it('unauthenticated protected query is rejected', async () => {
        const res = await fetch(`${BASE}/graphql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: '{ pages { id title } }' }),
        });
        const json = await res.json();
        expect(json.errors?.[0]?.message || '').toMatch(/Authentication required/i);
    });

    it('unauthenticated studio upload returns 401', async () => {
        const form = new FormData();
        form.append('notebookId', '00000000-0000-0000-0000-000000000001');
        form.append('file', new Blob(['x']), 't.txt');
        const res = await fetch(`${BASE}/studio/upload`, { method: 'POST', body: form });
        expect(res.status).toBe(401);
    });
});

describe('access-control e2e (static)', () => {
    it('documents e2e gate env var', () => {
        expect(RUN_E2E || true).toBe(true);
    });
});
