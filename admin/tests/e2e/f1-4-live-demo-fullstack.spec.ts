import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { loginAsAdmin } from './helpers/auth';

const MEDIA_DIR =
    process.env.F1_4_QA_MEDIA_DIR ||
    '/cursor/stores/bc-ffbd38c7-e468-5c00-9d54-d4915a5f658f/media';

const TENANT = '00000000-0000-0000-0000-000000000010';
const PG = process.env.F1_4_QA_PG_CONTAINER || 'postgres';
const DB = process.env.F1_4_QA_POSTGRES_DB || 'nusantarasoft';
const MIDDLEWARE = process.env.MIDDLEWARE_URL || 'http://127.0.0.1:4001';
const DOCKER = process.env.F1_4_DOCKER || 'sudo docker';

function psql(sql: string) {
    execSync(`${DOCKER} exec -i ${PG} psql -U postgres -d ${DB} -v ON_ERROR_STOP=1`, {
        input: sql,
        stdio: ['pipe', 'pipe', 'pipe'],
    });
}

function collectConsoleErrors(page: import('@playwright/test').Page) {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
    });
    return errors;
}

function assertCleanConsole(errors: string[]) {
    const ignored =
        /favicon|Failed to load resource.*404|NetworkError|ChunkLoadError|ERR_CONNECTION_REFUSED|net::ERR_FAILED|socket\.io|realtime\/v1\/websocket|WebSocket connection|Warning: \[antd:|Warning: \[rc-|THREE\.GLTFLoader|WebGL|MinIO|getaddrinfo ENOTFOUND minio|Failed to fetch stars/i;
    expect(errors.filter((e) => !ignored.test(e))).toEqual([]);
}

async function shot(page: import('@playwright/test').Page, name: string) {
    await page.screenshot({ path: path.join(MEDIA_DIR, name), fullPage: true });
}

test.describe.configure({ mode: 'serial', timeout: 180_000 });

test.describe('F1-4 Live vs Demo — full stack (live GraphQL)', () => {
    test.beforeAll(async () => {
        const res = await fetch(`${MIDDLEWARE}/graphql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: 'mutation($e:String!,$p:String!){ signIn(input:{email:$e,password:$p}){ accessToken } }',
                variables: { e: 'admin@nusantarasoft.local', p: 'Nusantarasoft123!' },
            }),
        });
        const body = await res.json();
        expect(body.data?.signIn?.accessToken, `live signIn required: ${JSON.stringify(body.errors ?? body)}`).toBeTruthy();
        psql(`UPDATE aos_settings SET ui_demo_mode = false WHERE tenant_id = '${TENANT}'`);
        psql(`UPDATE aos_agents SET archived_at = NULL WHERE tenant_id = '${TENANT}'`);
    });

    test('AI Studio routes', async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await loginAsAdmin(page);

        await page.goto('/admin/ai-studio', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2500);
        await shot(page, 'f1-4-aistudio-home-live.png');

        const routes: { path: string; file: string; expectDemo?: boolean; expectLive?: boolean }[] = [
            { path: '/admin/ai-studio/web-crawler', file: 'f1-4-aistudio-crawler-live.png', expectLive: true },
            { path: '/admin/ai-studio/knowledge-graph', file: 'f1-4-aistudio-knowledge-graph-live.png', expectLive: true },
            { path: '/admin/ai-studio/agent-builder', file: 'f1-4-aistudio-agent-builder-demo.png', expectDemo: true },
            { path: '/admin/ai-studio/label-studio', file: 'f1-4-aistudio-label-studio-demo.png', expectDemo: true },
            { path: '/admin/ai-studio/umkm', file: 'f1-4-aistudio-umkm-live.png' },
            { path: '/admin/ai-studio/ai-gateway', file: 'f1-4-aistudio-ai-gateway-live.png' },
            { path: '/admin/ai-studio/settings', file: 'f1-4-aistudio-settings-live.png' },
        ];

        for (const r of routes) {
            await page.goto(r.path, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(2000);
            if (r.expectDemo) {
                await expect(page.getByText('Demo', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
            }
            if (r.expectLive) {
                await expect(page.getByText('Live', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
            }
            await shot(page, r.file);
        }

        assertCleanConsole(errors);
    });

    test('Agentic OS routes', async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await loginAsAdmin(page);

        await page.goto('/admin/agentic-os', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Live', { exact: true }).first()).toBeVisible({ timeout: 90_000 });
        await page.waitForTimeout(2000);
        await shot(page, 'f1-4-aos-overview-live.png');

        for (const [app, file] of [
            ['tasks', 'f1-4-aos-tasks-live.png'],
            ['studio', 'f1-4-aos-agents-live.png'],
            ['governance', 'f1-4-aos-governance-live.png'],
        ] as const) {
            await page.goto(`/admin/agentic-os?app=${app}`, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(3500);
            await shot(page, file);
        }

        assertCleanConsole(errors);
    });

    test('Virtual Office Live + Demo', async ({ page }) => {
        const errors = collectConsoleErrors(page);
        psql(`UPDATE aos_settings SET ui_demo_mode = false WHERE tenant_id = '${TENANT}'`);
        await loginAsAdmin(page);
        await page.goto('/admin/virtual-office', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Live', { exact: true }).first()).toBeVisible({ timeout: 90_000 });
        await page.waitForTimeout(4000);
        await shot(page, 'f1-4-vo-live.png');

        psql(`UPDATE aos_settings SET ui_demo_mode = true WHERE tenant_id = '${TENANT}'`);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Demo', { exact: true }).first()).toBeVisible({ timeout: 90_000 });
        await page.waitForTimeout(4000);
        await shot(page, 'f1-4-vo-demo.png');
        psql(`UPDATE aos_settings SET ui_demo_mode = false WHERE tenant_id = '${TENANT}'`);

        assertCleanConsole(errors);
    });
});
