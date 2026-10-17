/**
 * Live stack: kasir-consult → aos_tasks. Run with RUN_F1_3_INTEGRATION=1 and middleware :4001.
 */
import { describe, expect, it } from 'vitest';

const RUN = process.env.RUN_F1_3_INTEGRATION === '1' || process.env.RUN_F1_3_INTEGRATION === 'true';
const BASE = (process.env.MIDDLEWARE_URL || 'http://127.0.0.1:4001').replace(/\/$/, '');
const KEY = process.env.KASIR_CONSULT_KEY || 'test-kasir-key-local';

describe.runIf(RUN)('kasir-consult AOS task mirror (integration)', () => {
    it('creates kasir_wa task via HTTP consult', async () => {
        const res = await fetch(`${BASE}/internal/kasir-consult`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-kasir-consult-key': KEY },
            body: JSON.stringify({ question: 'tanya stok aman' }),
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { status: string };
        expect(['off', 'hit', 'miss', 'error', 'redirect']).toContain(body.status);

        await new Promise((r) => setTimeout(r, 800));

        const gqlRes = await fetch(`${BASE}/graphql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: 'query { aosTasks(limit: 1) { id } }' }),
        });
        const gqlJson = (await gqlRes.json()) as { errors?: { message: string }[] };
        expect(gqlJson.errors?.[0]?.message).toMatch(/authentication required/i);
    });
});
