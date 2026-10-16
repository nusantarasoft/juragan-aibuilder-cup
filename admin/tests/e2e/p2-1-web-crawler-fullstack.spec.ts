import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { loginAsAdmin } from './helpers/auth';

const MEDIA_DIR =
    process.env.P2_1_QA_MEDIA_DIR ||
    '/cursor/stores/bc-ffbd38c7-e468-5c00-9d54-d4915a5f658f/media';

const TENANT = '00000000-0000-0000-0000-000000000010';
const PG = process.env.P2_1_QA_PG_CONTAINER || 'postgres';
const DB = process.env.P2_1_QA_POSTGRES_DB || 'nusantarasoft';
const MIDDLEWARE = process.env.MIDDLEWARE_URL || 'http://127.0.0.1:4001';
const DOCKER = process.env.P2_1_DOCKER || 'sudo docker';

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

test.describe('P2-1 Web Crawler — live GraphQL + worker', () => {
    test.beforeAll(async () => {
        psql(`
          CREATE TABLE IF NOT EXISTS studio_web_crawl_jobs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id TEXT NOT NULL DEFAULT '${TENANT}',
            name TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            config JSONB NOT NULL DEFAULT '{}'::jsonb,
            progress INT NOT NULL DEFAULT 0,
            pages_found INT NOT NULL DEFAULT 0,
            pages_scraped INT NOT NULL DEFAULT 0,
            errors INT NOT NULL DEFAULT 0,
            documents_generated INT NOT NULL DEFAULT 0,
            error_message TEXT,
            started_at TIMESTAMPTZ,
            finished_at TIMESTAMPTZ,
            created_by UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          DELETE FROM studio_web_crawl_jobs WHERE tenant_id = '${TENANT}' AND name LIKE 'P2-1 QA%';
        `);

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

    test('Live label, create job, list from API', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/ai-studio/web-crawler', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Live', { exact: true }).first()).toBeVisible({ timeout: 60_000 });
        await shot(page, 'p2-1-crawler-live-label.png');

        await page.getByLabel('Job Name').fill('P2-1 QA Crawl');
        await page.getByLabel('Seed URLs (One per line)').fill('https://example.com');
        await page.getByRole('button', { name: /Start Crawling/i }).click();
        await expect(page.getByText(/queued on the server worker/i)).toBeVisible({ timeout: 30_000 });

        await expect.poll(async () => {
            const rows = await page.locator('table tbody tr').count();
            return rows;
        }, { timeout: 90_000, intervals: [2000] }).toBeGreaterThan(0);

        await expect(page.getByText('P2-1 QA Crawl')).toBeVisible({ timeout: 60_000 });
        await shot(page, 'p2-1-crawler-job-list.png');
    });
});
