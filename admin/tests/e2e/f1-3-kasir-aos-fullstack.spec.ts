import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import path from 'path';
import { loginAsAdmin } from './helpers/auth';

const MEDIA_DIR =
    process.env.F13_QA_MEDIA_DIR ||
    '/cursor/stores/bc-ffbd38c7-e468-5c00-9d54-d4915a5f658f/media';
const TENANT = '00000000-0000-0000-0000-000000000010';
const PG = process.env.F13_QA_PG_CONTAINER || 'postgres';
const DB = process.env.F13_QA_POSTGRES_DB || 'nusantarasoft';
const MIDDLEWARE = process.env.MIDDLEWARE_URL || 'http://127.0.0.1:4001';
const KASIR_KEY = process.env.KASIR_CONSULT_KEY || 'test-kasir-key-local';

function psql(sql: string) {
    const pass = process.env.F13_QA_PG_PASSWORD || process.env.POSTGRES_PASSWORD || 'Nusantarasoft123!';
    const host = process.env.F13_QA_PG_HOST || '127.0.0.1';
    if (process.env.F13_QA_USE_DOCKER === '1') {
        execSync(`docker exec -i ${PG} psql -U postgres -d ${DB} -v ON_ERROR_STOP=1`, {
            input: sql,
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        return;
    }
    execSync(`PGPASSWORD=${JSON.stringify(pass)} psql -h ${host} -U postgres -d ${DB} -v ON_ERROR_STOP=1`, {
        input: sql,
        env: { ...process.env, PGPASSWORD: pass },
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
        /favicon|Failed to load resource.*404|NetworkError|ChunkLoadError|ERR_CONNECTION_REFUSED|net::ERR_FAILED|socket\.io|Warning: \[antd:|THREE\.GLTFLoader|MinIO|getaddrinfo ENOTFOUND minio/i;
    expect(errors.filter((e) => !ignored.test(e))).toEqual([]);
}

test.describe.configure({ mode: 'serial', timeout: 120_000 });

test.describe('F1-3 Kasir WA → AOS (live GraphQL)', () => {
    test.beforeAll(async () => {
        psql(`UPDATE aos_settings SET ui_demo_mode = false WHERE tenant_id = '${TENANT}'`);
        psql(
            `INSERT INTO aos_tasks (tenant_id, agent_id, title, module_id, route, steps, status, progress, source, started_at)
             SELECT '${TENANT}', id, 'WA Kasir · konsultasi', 'ai-studio', '/admin/ai-studio/umkm', '["Terima permintaan WA","Proses kasir","Kirim balasan"]'::jsonb, 'running', 0.55, 'kasir_wa', NOW()
             FROM aos_agents WHERE tenant_id = '${TENANT}' AND slug = 'umkm-kasir'
             AND NOT EXISTS (
               SELECT 1 FROM aos_tasks t WHERE t.agent_id = aos_agents.id AND t.source = 'kasir_wa' AND t.status IN ('queued','running')
             )`,
        );
        const res = await fetch(`${MIDDLEWARE}/internal/kasir-consult`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-kasir-consult-key': KASIR_KEY },
            body: JSON.stringify({ question: 'tanya modal usaha' }),
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { status: string };
        expect(body.status).not.toBe('off');
    });

    test('f1-3-aos-kasir-task.png', async ({ page }) => {
        const errors = collectConsoleErrors(page);
        psql(
            `UPDATE aos_tasks SET status = 'running', progress = 0.55, title = 'WA Kasir · konsultasi', archived_at = NULL
             WHERE id = (SELECT id FROM aos_tasks WHERE tenant_id = '${TENANT}' AND source = 'kasir_wa' ORDER BY created_at DESC LIMIT 1);`,
        );
        await loginAsAdmin(page);
        await page.goto('/admin/agentic-os?app=tasks', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);
        await expect(page.getByText('WA Kasir · konsultasi').first()).toBeVisible({ timeout: 90_000 });
        await page.screenshot({ path: path.join(MEDIA_DIR, 'f1-3-aos-kasir-task.png'), fullPage: true });
        assertCleanConsole(errors);
    });

    test('f1-3-vo-kasir-working.png', async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await loginAsAdmin(page);
        await page.goto('/admin/virtual-office', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('WA Kasir · konsultasi')).toBeVisible({ timeout: 60_000 });
        await page.screenshot({ path: path.join(MEDIA_DIR, 'f1-3-vo-kasir-working.png'), fullPage: true });
        assertCleanConsole(errors);
    });
});
