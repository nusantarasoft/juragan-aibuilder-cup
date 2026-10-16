import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { loginAsAdmin } from './helpers/auth';

const MEDIA_DIR =
    process.env.P2_3_QA_MEDIA_DIR ||
    '/cursor/stores/bc-ffbd38c7-e468-5c00-9d54-d4915a5f658f/media';

const TENANT = '00000000-0000-0000-0000-000000000010';
const PG = process.env.P2_3_QA_PG_CONTAINER || 'postgres';
const DB = process.env.P2_3_QA_POSTGRES_DB || 'nusantarasoft';
const MIDDLEWARE = process.env.MIDDLEWARE_URL || 'http://127.0.0.1:4001';
const DOCKER = process.env.P2_3_DOCKER || 'sudo docker';
const REPO_ROOT = path.resolve(__dirname, '../../..');

function psql(sql: string) {
    execSync(`${DOCKER} exec -i ${PG} psql -U postgres -d ${DB} -v ON_ERROR_STOP=1`, {
        input: sql,
        stdio: ['pipe', 'pipe', 'pipe'],
    });
}

async function shot(page: import('@playwright/test').Page, name: string) {
    await page.screenshot({ path: path.join(MEDIA_DIR, name), fullPage: true });
}

test.describe.configure({ mode: 'serial', timeout: 240_000 });

test.describe('P2-3 Agent Builder — live GraphQL + persisted workflows', () => {
    test.beforeAll(async () => {
        const migration = readFileSync(
            path.join(REPO_ROOT, 'supabase/migrations/20261015180000_studio_agent_workflows.sql'),
            'utf8',
        );
        psql(migration);
        psql(`DELETE FROM studio_agent_workflows WHERE tenant_id = '${TENANT}' AND name LIKE 'P2-3 QA%';`);

        const res = await fetch(`${MIDDLEWARE}/graphql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: 'mutation($e:String!,$p:String!){ signIn(input:{email:$e,password:$p}){ accessToken } }',
                variables: { e: 'admin@nusantarasoft.local', p: 'Nusantarasoft123!' },
            }),
        });
        const body = await res.json();
        expect(body.data?.signIn?.accessToken, JSON.stringify(body.errors ?? body)).toBeTruthy();
    });

    test('Live label, create workflow, add node, save', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/ai-studio/agent-builder', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Live', { exact: true }).first()).toBeVisible({ timeout: 60_000 });
        await shot(page, 'p2-3-builder-live-label.png');

        await page.getByRole('button', { name: /New workflow/i }).click();
        await page.getByPlaceholder('Workflow name').fill('P2-3 QA Workflow');
        await page.getByRole('button', { name: /^Create$/i }).click();
        await expect(page.getByText(/Workflow created/i)).toBeVisible({ timeout: 30_000 });
        await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 });

        const palette = page.locator('.ant-collapse').first();
        await palette.getByText('Webhook Trigger').click();
        await palette.getByText('Intent Classifier').click();
        await expect(page.getByText('Intent Classifier').nth(1)).toBeVisible({ timeout: 15_000 });

        await page.getByTestId('agent-builder-save').click();
        await expect(page.getByText(/saved to the database/i)).toBeVisible({ timeout: 30_000 });
        await shot(page, 'p2-3-builder-canvas-saved.png');

        await page.getByRole('button', { name: /Test Run/i }).click();
        await expect(page.getByText(/Test run recorded/i)).toBeVisible({ timeout: 30_000 });
        await shot(page, 'p2-3-builder-test-run.png');
    });
});
