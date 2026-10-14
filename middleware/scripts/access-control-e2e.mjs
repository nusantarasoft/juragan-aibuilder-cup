#!/usr/bin/env node
/**
 * ACCESS_CONTROL_E2E=1 node middleware/scripts/access-control-e2e.mjs
 */
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

const BASE = process.env.MIDDLEWARE_URL || 'http://127.0.0.1:4001';
const GRAPHQL = `${BASE}/graphql`;
const EMAIL = process.env.AUTH_INTEGRATION_EMAIL || 'admin@nusantarasoft.local';
const PASS = process.env.AUTH_INTEGRATION_PASSWORD || 'Nusantarasoft123!';
const KASIR_KEY = process.env.KASIR_CONSULT_KEY || 'test-kasir-key-local';
const NGINX_CONF = process.env.NGINX_CONF || join(process.cwd(), 'volumes/nginx/nginx.conf');
const LANDING = process.env.LANDING_URL || 'http://127.0.0.1:3000';
const ADMIN = process.env.ADMIN_URL || 'http://127.0.0.1:3003';

const MODULE_PROBES = [
    { module: 'pages', query: '{ pages { id } }' },
    { module: 'users', query: '{ users { id } }' },
    { module: 'media', query: '{ media(limit: 1) { id } }' },
    { module: 'crm', query: '{ accounts(tenantId: "00000000-0000-0000-0000-000000000010") { id } }' },
    { module: 'agentic-os', query: '{ aosAgents { id } }' },
    { module: 'inventory', query: '{ invItems(tenantId: "00000000-0000-0000-0000-000000000010") { id } }' },
    { module: 'studio', query: '{ studioNotebooks }' },
    { module: 'itsm', query: '{ itsmTickets { id } }' },
    { module: 'blocks', query: '{ blocks { id } }' },
    { module: 'settings', query: '{ settings { id } }' },
];

const results = [];
const pass = (n, d = '') => {
    results.push({ name: n, ok: true, detail: d });
    console.log(`PASS ${n}${d ? ` — ${d}` : ''}`);
};
const fail = (n, d) => {
    results.push({ name: n, ok: false, detail: d });
    console.error(`FAIL ${n} — ${d}`);
};

async function gql(query, variables, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(GRAPHQL, { method: 'POST', headers, body: JSON.stringify({ query, variables }) });
    const json = await res.json();
    return { status: res.status, json };
}

async function main() {
    const { json: health } = await gql('{ health }');
    if (health.data?.health === 'OK') pass('public GraphQL health');
    else fail('public GraphQL health', JSON.stringify(health));

    for (const { module, query } of MODULE_PROBES) {
        const { json } = await gql(query);
        const msg = json.errors?.[0]?.message || '';
        if (/Authentication required/i.test(msg)) pass(`unauth rejected: ${module}`);
        else fail(`unauth rejected: ${module}`, msg || JSON.stringify(json.data));
    }

    const form = new FormData();
    form.append('notebookId', '00000000-0000-0000-0000-000000000001');
    form.append('file', new Blob(['x']), 't.txt');
    const up = await fetch(`${BASE}/studio/upload`, { method: 'POST', body: form });
    if (up.status === 401) pass('unauth REST studio/upload 401');
    else fail('unauth REST studio/upload', String(up.status));

    const { json: signed } = await gql(
        `mutation($e:String!,$p:String!){ signIn(input:{email:$e,password:$p}){ accessToken user{id role} } }`,
        { e: EMAIL, p: PASS },
    );
    const token = signed.data?.signIn?.accessToken;
    if (!token) {
        fail('auth signIn', JSON.stringify(signed));
        printSummary();
        process.exit(1);
    }
    pass('auth signIn', signed.data.signIn.user?.role || 'authenticated');

    for (const { module, query } of [
        { module: 'blocks', query: '{ blocks { id } }' },
        { module: 'settings', query: '{ settings { id } }' },
        { module: 'media', query: '{ media(limit: 1) { id } }' },
        { module: 'agentic-os', query: '{ aosAgents { id } }' },
    ]) {
        const { json } = await gql(query, undefined, token);
        const msg = json.errors?.[0]?.message || '';
        if (/Authentication required/i.test(msg)) fail(`auth ok: ${module}`, msg);
        else if (json.errors?.length && /schema cache|does not exist/i.test(msg))
            pass(`auth ok: ${module}`, 'JWT accepted (DB slice incomplete in QA stack)');
        else if (json.errors?.length) fail(`auth ok: ${module}`, msg);
        else pass(`auth ok: ${module}`);
    }

    const fakeTenant = '00000000-0000-0000-0000-000000000099';
    const { json: ct } = await gql(
        `query($t:String!){ aosTasks(tenantId:$t, limit:5){ id tenantId } }`,
        { t: fakeTenant },
        token,
    );
    if (ct.errors?.length) pass('cross-tenant aosTasks', 'error or empty');
    else if (Array.isArray(ct.data?.aosTasks) && ct.data.aosTasks.every((r) => !r.tenantId || r.tenantId === fakeTenant))
        pass('cross-tenant aosTasks', `rows=${ct.data.aosTasks.length}`);
    else fail('cross-tenant aosTasks', JSON.stringify(ct.data?.aosTasks?.slice(0, 3)));

    const kasirOk = await fetch(`${BASE}/internal/kasir-consult`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-kasir-consult-key': KASIR_KEY },
        body: JSON.stringify({ question: 'test kurikulum' }),
    });
    if (kasirOk.status === 401) fail('kasir-consult with key', '401');
    else pass('kasir-consult with key', String(kasirOk.status));
    const kasirBad = await fetch(`${BASE}/internal/kasir-consult`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'x' }),
    });
    if (kasirBad.status === 401) pass('kasir-consult missing key 401');
    else fail('kasir-consult missing key', String(kasirBad.status));

    const conf = readFileSync(NGINX_CONF, 'utf8');
    if (/location\s+\/internal/.test(conf)) fail('nginx /internal exposed');
    else pass('nginx no /internal route');

    const lp = await fetch(LANDING, { redirect: 'follow' });
    if (lp.status < 500) pass('landing page', String(lp.status));
    else fail('landing page', String(lp.status));

    const adminLogin = await fetch(`${ADMIN}/login`, { redirect: 'manual' });
    if (adminLogin.status < 500) pass('admin login page', String(adminLogin.status));
    else fail('admin login page', String(adminLogin.status));

    const mediaApi = await fetch(`${ADMIN}/api/media`, { method: 'POST' });
    if (mediaApi.status === 401) pass('admin /api/media unauth 401');
    else fail('admin /api/media unauth', String(mediaApi.status));

    printSummary();
    if (results.some((r) => !r.ok)) process.exit(1);
}

function printSummary() {
    const ok = results.filter((r) => r.ok).length;
    const bad = results.length - ok;
    console.log(`\n=== E2E ${ok}/${results.length} passed (${bad} failed) ===`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
