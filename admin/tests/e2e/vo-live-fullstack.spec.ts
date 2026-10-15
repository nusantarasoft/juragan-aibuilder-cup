import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { loginAsAdmin } from './helpers/auth';

const MEDIA_DIR =
    process.env.VO_QA_MEDIA_DIR ||
    '/cursor/stores/bc-ffbd38c7-e468-5c00-9d54-d4915a5f658f/media';

const TENANT = '00000000-0000-0000-0000-000000000010';
const PG = process.env.VO_QA_PG_CONTAINER || 'postgres';
const DB = process.env.VO_QA_POSTGRES_DB || 'nusantarasoft';

function psql(sql: string) {
    execSync(`docker exec -i ${PG} psql -U postgres -d ${DB} -v ON_ERROR_STOP=1`, {
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
        /favicon|Failed to load resource.*404|NetworkError|ChunkLoadError|ERR_CONNECTION_REFUSED|net::ERR_FAILED|socket\.io|Warning: \[antd:|THREE\.GLTFLoader/i;
    expect(errors.filter((e) => !ignored.test(e))).toEqual([]);
}

test.describe.configure({ mode: 'serial', timeout: 120_000 });

test.describe('VO Live — full stack (real GraphQL)', () => {
    test('vo-empty-tenant.png', async ({ page }) => {
        const errors = collectConsoleErrors(page);
        psql(`UPDATE aos_agents SET archived_at = NOW() WHERE tenant_id = '${TENANT}' AND archived_at IS NULL`);
        psql(`UPDATE aos_settings SET ui_demo_mode = false WHERE tenant_id = '${TENANT}'`);
        await loginAsAdmin(page);
        await page.goto('/admin/virtual-office', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('No agents in this tenant yet')).toBeVisible({ timeout: 45_000 });
        await expect(page.getByText('Live', { exact: true }).first()).toBeVisible();
        await page.screenshot({ path: path.join(MEDIA_DIR, 'vo-empty-tenant.png'), fullPage: true });
        assertCleanConsole(errors);
    });

    test('vo-agent-idle.png', async ({ page }) => {
        const errors = collectConsoleErrors(page);
        psql(`UPDATE aos_agents SET archived_at = NOW() WHERE tenant_id = '${TENANT}'`);
        psql(
            `UPDATE aos_agents SET archived_at = NULL, status = 'active' WHERE tenant_id = '${TENANT}' AND slug = 'arjuna'`,
        );
        psql(`UPDATE aos_tasks SET status = 'done' WHERE tenant_id = '${TENANT}' AND agent_id IN (SELECT id FROM aos_agents WHERE slug = 'arjuna')`);
        psql(`UPDATE aos_settings SET ui_demo_mode = false WHERE tenant_id = '${TENANT}'`);
        await loginAsAdmin(page);
        await page.goto('/admin/virtual-office', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('button', { name: /Arjuna/i })).toBeVisible({ timeout: 45_000 });
        await page.screenshot({ path: path.join(MEDIA_DIR, 'vo-agent-idle.png'), fullPage: true });
        assertCleanConsole(errors);
    });

    test('vo-agent-working-real-task.png', async ({ page }) => {
        const errors = collectConsoleErrors(page);
        psql(
            `INSERT INTO aos_tasks (tenant_id, agent_id, title, module_id, route, steps, status, progress, source, started_at)
             SELECT '${TENANT}', id, 'VO QA — live queue task', 'reports', '/admin/agentic-os', '["Gather","Draft","Review"]'::jsonb, 'running', 0.55, 'dispatch', NOW()
             FROM aos_agents WHERE tenant_id = '${TENANT}' AND slug = 'arjuna'
             AND NOT EXISTS (
               SELECT 1 FROM aos_tasks t WHERE t.agent_id = aos_agents.id AND t.status IN ('queued','running') AND t.title = 'VO QA — live queue task'
             )`,
        );
        psql(
            `UPDATE aos_tasks SET status = 'running', progress = 0.55, title = 'VO QA — live queue task', started_at = NOW()
             WHERE tenant_id = '${TENANT}' AND agent_id = (SELECT id FROM aos_agents WHERE slug = 'arjuna' LIMIT 1) AND status IN ('queued','running','review')`,
        );
        psql(`UPDATE aos_settings SET ui_demo_mode = false WHERE tenant_id = '${TENANT}'`);
        await loginAsAdmin(page);
        await page.goto('/admin/virtual-office', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('VO QA — live queue task')).toBeVisible({ timeout: 45_000 });
        await page.screenshot({ path: path.join(MEDIA_DIR, 'vo-agent-working-real-task.png'), fullPage: true });
        assertCleanConsole(errors);
    });

    test('vo-demo-mode.png', async ({ page }) => {
        const errors = collectConsoleErrors(page);
        psql(`UPDATE aos_settings SET ui_demo_mode = true WHERE tenant_id = '${TENANT}'`);
        psql(`UPDATE aos_agents SET archived_at = NULL WHERE tenant_id = '${TENANT}'`);
        await loginAsAdmin(page);
        await page.goto('/admin/virtual-office', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(6000);
        await expect(page.getByText('Demo', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
        await expect(page.getByRole('button', { name: /Arjuna|Semar|Bima/i }).first()).toBeVisible();
        await page.screenshot({ path: path.join(MEDIA_DIR, 'vo-demo-mode.png'), fullPage: true });
        assertCleanConsole(errors);
        psql(`UPDATE aos_settings SET ui_demo_mode = false WHERE tenant_id = '${TENANT}'`);
    });
});
