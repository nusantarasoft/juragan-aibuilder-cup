#!/usr/bin/env node
/**
 * Idempotent CMS super-admin bootstrap (Supabase Auth + user_profiles).
 * Usage: node scripts/init-cms-admin.mjs
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = join(repoRoot, '.env');
if (!existsSync(envFile)) {
    console.error('.env not found');
    process.exit(1);
}

const envVars = {};
for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) envVars[m[1].trim()] = m[2].trim();
}

const serviceKey = envVars.SERVICE_ROLE_KEY;
const kongUrl = process.env.API_EXTERNAL_URL || envVars.API_EXTERNAL_URL || 'http://localhost:8000';
const email = process.env.CMS_ADMIN_EMAIL || 'admin@nusantarasoft.local';
const password = process.env.CMS_ADMIN_PASSWORD || envVars.ADMIN_PASSWORD || 'Nusantarasoft123!';
const pgContainer = process.env.QA_PG_CONTAINER || 'postgres';
const db = process.env.POSTGRES_DB || envVars.POSTGRES_DB || 'nusantarasoft';

if (!serviceKey) {
    console.error('SERVICE_ROLE_KEY missing in .env');
    process.exit(1);
}

const headers = {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
};

const listRes = await fetch(`${kongUrl}/auth/v1/admin/users?page=1&per_page=50`, { headers });
if (!listRes.ok) {
    console.error('List users failed', listRes.status, await listRes.text());
    process.exit(1);
}
const list = await listRes.json();
let userId = list.users?.find((u) => u.email === email)?.id;

if (!userId) {
    const createRes = await fetch(`${kongUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: 'Super Admin' },
        }),
    });
    if (!createRes.ok) {
        console.error('Create user failed', createRes.status, await createRes.text());
        process.exit(1);
    }
    const created = await createRes.json();
    userId = created.id;
    console.log('Created auth user:', userId);
} else {
    console.log('Auth user exists:', userId);
}

const sql = `
INSERT INTO public.user_profiles (id, email, full_name, role, two_factor_enabled)
VALUES ('${userId}', '${email}', 'Super Admin', 'super_admin', false)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = 'super_admin';
SELECT id, email, role FROM public.user_profiles WHERE id = '${userId}';
`;
const docker = process.env.QA_DOCKER_CMD || 'sudo docker';
execSync(`${docker} exec -i ${pgContainer} psql -U postgres -d ${db} -v ON_ERROR_STOP=1`, {
    input: sql,
    stdio: ['pipe', 'inherit', 'inherit'],
});

const signInRes = await fetch(`${process.env.MIDDLEWARE_URL || 'http://127.0.0.1:4001'}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        query: 'mutation($e:String!,$p:String!){ signIn(input:{email:$e,password:$p}){ accessToken user { email role } } }',
        variables: { e: email, p: password },
    }),
});
const signInBody = await signInRes.json();
if (signInBody.errors?.length || !signInBody.data?.signIn?.accessToken) {
    console.error('Middleware signIn check failed', JSON.stringify(signInBody, null, 2));
    process.exit(1);
}
console.log('Middleware signIn OK:', signInBody.data.signIn.user.email, signInBody.data.signIn.user.role);
