import { test, expect } from '@playwright/test';
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loginAsAdmin } from './helpers/auth';

/** Host middleware must set `HERMES_BRIDGE_URL=http://127.0.0.1:8765` (see scripts/qa-percakapan-wa-full-gate.sh). */
const GRAPHQL = process.env.GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';
const MIDDLEWARE = process.env.MIDDLEWARE_URL || 'http://127.0.0.1:4001';
const DOCKER = process.env.QA_DOCKER || 'docker';
const PG = process.env.PG_CONTAINER || 'postgres';
const DB = process.env.POSTGRES_DB || 'nusantarasoft';
const REPO = path.resolve(__dirname, '../../..');
const HERMES_MOCK_LOG = '/tmp/qa-hermes-last-send.json';
const CONV_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const EXPIRED_CONV = 'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee';

function psqlFile(rel: string) {
    const file = path.join(REPO, rel);
    execSync(`${DOCKER} exec -i ${PG} psql -U postgres -d ${DB} -v ON_ERROR_STOP=1`, {
        input: fs.readFileSync(file),
        stdio: ['pipe', 'pipe', 'pipe'],
    });
}

async function gql<T>(
    query: string,
    variables?: Record<string, unknown>,
    token?: string,
): Promise<{ data?: T; errors?: { message: string }[] }> {
    const res = await fetch(GRAPHQL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query, variables }),
    });
    return res.json();
}

test.describe.configure({ mode: 'serial', timeout: 300_000 });

test.describe('Percakapan WA — super admin inbox', () => {
    let superToken = '';
    let mockProc: ReturnType<typeof spawn> | null = null;

    test.beforeAll(async () => {
        try {
            fs.unlinkSync(HERMES_MOCK_LOG);
        } catch {
            /* ok */
        }
        mockProc = spawn('python3', [path.join(REPO, 'scripts/qa-hermes-send-mock.py'), '8765'], {
            detached: true,
            stdio: 'ignore',
        });
        mockProc.unref();
        await new Promise((r) => setTimeout(r, 800));

        psqlFile('supabase/migrations/20261017120000_studio_wa_conversations.sql');
        psqlFile('supabase/qa-seeds/20261017130000_studio_wa_conversations_qa.sql');

        const signIn = await gql<{ signIn: { accessToken: string } }>(
            'mutation($e:String!,$p:String!){ signIn(input:{email:$e,password:$p}){ accessToken user { role } } }',
            { e: 'admin@nusantarasoft.local', p: 'Nusantarasoft123!' },
        );
        superToken = signIn.data?.signIn?.accessToken || '';
        expect(superToken, JSON.stringify(signIn.errors)).toBeTruthy();
    });

    test.afterAll(() => {
        if (mockProc?.pid) {
            try {
                process.kill(-mockProc.pid, 'SIGTERM');
            } catch {
                /* ok */
            }
        }
    });

    test('GraphQL lists seeded conversation', async () => {
        const res = await gql<{ studioWaConversations: { id: string; ownerPhone: string }[] }>(
            `query { studioWaConversations { id ownerPhone lastMessagePreview } }`,
            undefined,
            superToken,
        );
        expect(res.errors, JSON.stringify(res.errors)).toBeUndefined();
        const row = res.data?.studioWaConversations?.find((c) => c.id === CONV_ID);
        expect(row?.ownerPhone).toBe('6289990000001');
    });

    test('non-super-admin blocked on studioWaConversations', async () => {
        execSync(
            `${DOCKER} exec -i ${PG} psql -U postgres -d ${DB} -v ON_ERROR_STOP=1 -c "UPDATE public.user_profiles SET role = 'admin' WHERE email = 'admin@nusantarasoft.local';"`,
        );
        const demoted = await gql<{ signIn: { accessToken: string } }>(
            'mutation($e:String!,$p:String!){ signIn(input:{email:$e,password:$p}){ accessToken } }',
            { e: 'admin@nusantarasoft.local', p: 'Nusantarasoft123!' },
        );
        const adminToken = demoted.data?.signIn?.accessToken;
        expect(adminToken).toBeTruthy();
        const denied = await gql(
            `query { studioWaConversations { id } }`,
            undefined,
            adminToken,
        );
        expect(denied.errors?.[0]?.message).toMatch(/permission|super admin|required/i);
        execSync(
            `${DOCKER} exec -i ${PG} psql -U postgres -d ${DB} -v ON_ERROR_STOP=1 -c "UPDATE public.user_profiles SET role = 'super_admin' WHERE email = 'admin@nusantarasoft.local';"`,
        );
    });

    test('UI list, thread, takeover, human reply (mock bridge), release, auto-release', async ({
        page,
    }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/ai-studio/messages', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible({
            timeout: 60_000,
        });
        await expect(page.getByText('6289990000001', { exact: true }).first()).toBeVisible({
            timeout: 30_000,
        });
        await page.getByText('6289990000001', { exact: true }).first().click();
        await expect(page.getByText('AI', { exact: true }).first()).toBeVisible();
        await expect(page.getByText('Stok Indomie goreng')).toBeVisible();

        await page.getByRole('button', { name: 'Take over' }).click();
        await expect(page.getByRole('button', { name: 'Return to AI' })).toBeVisible({
            timeout: 15_000,
        });

        const inboundDuringTakeover = `Inbound QA poll ${Date.now()}`;
        execSync(
            `${DOCKER} exec -i ${PG} psql -U postgres -d ${DB} -v ON_ERROR_STOP=1 -c "INSERT INTO public.studio_wa_messages (conversation_id, tenant_id, author_kind, body_text) VALUES ('${CONV_ID}', '00000000-0000-0000-0000-000000000010', 'owner', '${inboundDuringTakeover}'); UPDATE public.studio_wa_conversations SET last_message_preview = '${inboundDuringTakeover}', last_message_at = now() WHERE id = '${CONV_ID}';"`,
        );
        await expect(page.getByText(inboundDuringTakeover)).toBeVisible({ timeout: 15_000 });

        const reply = `Balasan QA ${Date.now()}`;
        await page.getByPlaceholder('Reply to store owner').fill(reply);
        await page.getByRole('button', { name: 'Send' }).click();
        await expect(page.getByText('Message sent')).toBeVisible({ timeout: 20_000 });

        await expect.poll(() => fs.existsSync(HERMES_MOCK_LOG), { timeout: 15_000 }).toBe(true);
        const sent = JSON.parse(fs.readFileSync(HERMES_MOCK_LOG, 'utf-8')) as { message?: string };
        expect(sent.message).toContain(reply);
        expect(sent.message).toContain('— Admin Nusantarasoft');

        await page.getByRole('button', { name: 'Return to AI' }).click();
        await expect(page.getByText('Returned to AI')).toBeVisible({ timeout: 15_000 });

        await page.getByText('6289990000002', { exact: true }).first().click();
        await expect(page.getByText('Expired takeover thread')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Take over' })).toBeVisible({
            timeout: 15_000,
        });
    });

    test('empty state copy when no rows (graphql mock)', async ({ page }) => {
        await loginAsAdmin(page);
        await page.route('**/graphql', async (route) => {
            const post = route.request().postDataJSON() as { query?: string };
            if (post.query?.includes('studioWaConversations')) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: { studioWaConversations: [] } }),
                });
                return;
            }
            await route.continue();
        });
        await page.goto('/admin/ai-studio/messages', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('No WA conversations yet')).toBeVisible({ timeout: 30_000 });
    });
});
