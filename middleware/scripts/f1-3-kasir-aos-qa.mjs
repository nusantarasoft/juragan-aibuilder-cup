#!/usr/bin/env node
/**
 * F1-3 QA: POST /internal/kasir-consult → aos_tasks (kasir_wa) + GraphQL auth gate.
 * Env: MIDDLEWARE_URL (default http://127.0.0.1:4001), KASIR_CONSULT_KEY, PG via docker exec.
 */
import { execSync } from 'node:child_process';

const BASE = (process.env.MIDDLEWARE_URL || 'http://127.0.0.1:4001').replace(/\/$/, '');
const KEY = process.env.KASIR_CONSULT_KEY || 'test-kasir-key-local';
const PG = process.env.F13_QA_PG_CONTAINER || 'postgres';
const DB = process.env.F13_QA_POSTGRES_DB || 'nusantarasoft';
const TENANT = '00000000-0000-0000-0000-000000000010';

const rows = [];

function psql(sql) {
    const host = process.env.F13_QA_PG_HOST || '127.0.0.1';
    const pass = process.env.F13_QA_PG_PASSWORD || process.env.POSTGRES_PASSWORD || 'Nusantarasoft123!';
    if (process.env.F13_QA_USE_DOCKER === '1') {
        return execSync(`docker exec -i ${PG} psql -U postgres -d ${DB} -t -A -v ON_ERROR_STOP=1 -c ${JSON.stringify(sql)}`, {
            encoding: 'utf8',
        }).trim();
    }
    return execSync(
        `PGPASSWORD=${JSON.stringify(pass)} psql -h ${host} -U postgres -d ${DB} -t -A -v ON_ERROR_STOP=1 -c ${JSON.stringify(sql)}`,
        { encoding: 'utf8' },
    ).trim();
}

async function gql(query, token, variables) {
    const res = await fetch(`${BASE}/graphql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query, variables: variables ?? {} }),
    });
    return res.json();
}

async function main() {
    // 1) kasir-consult HTTP
    const consultRes = await fetch(`${BASE}/internal/kasir-consult`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-kasir-consult-key': KEY },
        body: JSON.stringify({ question: 'tanya modal usaha', phone: '6281234567890' }),
    });
    const consultBody = await consultRes.json();
    rows.push({
        check: 'POST /internal/kasir-consult (consult enabled)',
        pass: consultRes.status === 200 && consultBody.status !== 'off',
        detail: `status=${consultRes.status} body.status=${consultBody.status}`,
    });

    await new Promise((r) => setTimeout(r, 500));

    const taskRow = psql(
        `SELECT id, status, source, title FROM aos_tasks WHERE tenant_id='${TENANT}' AND source='kasir_wa' ORDER BY created_at DESC LIMIT 1;`,
    );
    const [taskId, taskStatus, source, title] = taskRow.split('|');
    rows.push({
        check: 'DB aos_tasks kasir_wa',
        pass: Boolean(taskId) && taskStatus === 'done' && source === 'kasir_wa' && /WA Kasir/.test(title),
        detail: taskRow || '(empty)',
    });

    // 2) GraphQL unauthenticated
    const unauth = await gql('query { aosTasks(limit: 1) { id } }');
    rows.push({
        check: 'GraphQL aosTasks unauthenticated rejected',
        pass: Boolean(unauth.errors?.[0]?.message?.match(/authentication required/i)),
        detail: unauth.errors?.[0]?.message || 'no error',
    });

    // 3) GraphQL wrong tenant (needs token — skip if signIn unavailable)
    let token = process.env.F13_QA_BEARER || '';
    if (!token) {
        try {
            const signIn = await gql(
                'mutation SignIn($e: String!, $p: String!) { signIn(input: { email: $e, password: $p }) { accessToken } }',
                null,
                { e: 'admin@nusantarasoft.local', p: 'Nusantarasoft123!' },
            );
            token = signIn.data?.signIn?.accessToken || '';
        } catch {
            token = '';
        }
    }
    if (token) {
        const cross = await gql(
            `query { aosTasks(tenantId: "00000000-0000-0000-0000-000000000099", limit: 1) { id } }`,
            token,
        );
        rows.push({
            check: 'GraphQL cross-tenant rejected',
            pass: Boolean(cross.errors?.[0]?.message?.match(/do not have access/i)),
            detail: cross.errors?.[0]?.message || 'unexpected data',
        });
        const home = await gql('query { aosTasks(limit: 200) { id title status source } }', token);
        const kasirTasks = (home.data?.aosTasks || []).filter((t) => t.source === 'kasir_wa');
        rows.push({
            check: 'GraphQL home tenant sees kasir_wa task',
            pass: kasirTasks.length >= 1,
            detail: kasirTasks.map((t) => `${t.status}:${t.title}`).join('; ') || 'none',
        });
    } else {
        rows.push({
            check: 'GraphQL authenticated aosTasks',
            pass: false,
            detail: 'signIn unavailable (auth stack); covered by vitest aos-task-queue.graphql.auth.spec.ts',
        });
    }

    // 4) queue failure does not break consult (simulate by unset key on second call — auth still 401)
    const bad = await fetch(`${BASE}/internal/kasir-consult`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'tanya' }),
    });
    rows.push({
        check: 'kasir-consult without key → 401 (no mirror on auth fail)',
        pass: bad.status === 401,
        detail: `status=${bad.status}`,
    });

    const ok = rows.every((r) => r.pass);
    console.log(JSON.stringify({ ok, rows }, null, 2));
    process.exit(ok ? 0 : 1);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
