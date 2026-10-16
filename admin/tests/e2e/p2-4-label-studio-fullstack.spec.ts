import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { loginAsAdmin } from './helpers/auth';

const MEDIA_DIR =
    process.env.P2_4_QA_MEDIA_DIR ||
    '/cursor/stores/bc-ffbd38c7-e468-5c00-9d54-d4915a5f658f/media';

const TENANT = '00000000-0000-0000-0000-000000000010';
const PG = process.env.P2_4_QA_PG_CONTAINER || 'postgres';
const DB = process.env.P2_4_QA_POSTGRES_DB || 'nusantarasoft';
const MIDDLEWARE = process.env.MIDDLEWARE_URL || 'http://127.0.0.1:4001';
const DOCKER = process.env.P2_4_DOCKER || 'sudo docker';
const REPO_ROOT = path.resolve(__dirname, '../../..');
const LS = process.env.P2_4_LABELSTUDIO_URL || 'http://127.0.0.1:8080';

function psql(sql: string) {
    execSync(`${DOCKER} exec -i ${PG} psql -U postgres -d ${DB} -v ON_ERROR_STOP=1`, {
        input: sql,
        stdio: ['pipe', 'pipe', 'pipe'],
    });
}

async function shot(page: import('@playwright/test').Page, name: string) {
    await page.screenshot({ path: path.join(MEDIA_DIR, name), fullPage: true });
}

async function gql(token: string, query: string, variables?: Record<string, unknown>) {
    const res = await fetch(`${MIDDLEWARE}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query, variables: variables ?? {} }),
    });
    return res.json();
}

test.describe.configure({ mode: 'serial', timeout: 300_000 });

test.describe('P2-4 Label Studio — live GraphQL + Label Studio API', () => {
    let accessToken = '';

    test.beforeAll(async () => {
        psql(`UPDATE aos_settings SET ui_demo_mode = false WHERE tenant_id = '${TENANT}';`);

        try {
            execSync(`${DOCKER} compose -f ${path.join(REPO_ROOT, 'docker-compose.full.yml')} up -d labelstudio`, {
                stdio: 'pipe',
                timeout: 120_000,
            });
        } catch {
            /* may already be running */
        }

        for (let i = 0; i < 45; i++) {
            try {
                const ping = await fetch(`${LS}/health`, { signal: AbortSignal.timeout(3000) });
                if (ping.ok) break;
            } catch {
                /* wait */
            }
            await new Promise((r) => setTimeout(r, 2000));
        }

        const signIn = await fetch(`${MIDDLEWARE}/graphql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: 'mutation($e:String!,$p:String!){ signIn(input:{email:$e,password:$p}){ accessToken } }',
                variables: { e: 'admin@nusantarasoft.local', p: 'Nusantarasoft123!' },
            }),
        });
        const signBody = await signIn.json();
        accessToken = signBody.data?.signIn?.accessToken;
        expect(accessToken, JSON.stringify(signBody.errors ?? signBody)).toBeTruthy();

        const dash = await gql(
            accessToken,
            `query { studioLabelStudioDashboard { configured message projects { name } } }`,
        );
        expect(dash.errors, JSON.stringify(dash.errors)).toBeUndefined();
        expect(dash.data?.studioLabelStudioDashboard?.configured, dash.data?.studioLabelStudioDashboard?.message).toBe(true);
    });

    test('Live label and project stats from API', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/ai-studio/label-studio', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Live', { exact: true }).first()).toBeVisible({ timeout: 60_000 });
        await shot(page, 'p2-4-label-studio-live-label.png');

        await expect(page.getByText('Projects').first()).toBeVisible({ timeout: 30_000 });
        await shot(page, 'p2-4-label-studio-project-stats.png');

        await expect(page.getByText('Recent Annotations').first()).toBeVisible();
        await shot(page, 'p2-4-label-studio-recent.png');
    });
});
