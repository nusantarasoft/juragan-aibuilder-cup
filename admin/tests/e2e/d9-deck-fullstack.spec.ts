import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { loginAsAdmin } from './helpers/auth';

const MEDIA_DIR =
    process.env.D9_QA_MEDIA_DIR ||
    '/cursor/stores/bc-ffbd38c7-e468-5c00-9d54-d4915a5f658f/media';

const TENANT = '00000000-0000-0000-0000-000000000010';
const PG = process.env.D9_QA_PG_CONTAINER || 'postgres';
const DB = process.env.D9_QA_POSTGRES_DB || 'nusantarasoft';
const MIDDLEWARE = process.env.MIDDLEWARE_URL || 'http://127.0.0.1:4001';
const DOCKER = process.env.D9_DOCKER || 'sudo docker';

function psql(sql: string) {
    execSync(`${DOCKER} exec -i ${PG} psql -U postgres -d ${DB} -v ON_ERROR_STOP=1`, {
        input: sql,
        stdio: ['pipe', 'pipe', 'pipe'],
    });
}

async function shot(page: import('@playwright/test').Page, name: string) {
    await page.screenshot({ path: path.join(MEDIA_DIR, name), fullPage: true });
}

test.describe.configure({ mode: 'serial', timeout: 180_000 });

test.describe('D-9 Command Deck + Live/Demo — full stack (live GraphQL)', () => {
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
    });

    test('Command Deck views + Live badge', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/agentic-os', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Live', { exact: true }).first()).toBeVisible({ timeout: 90_000 });
        await page.waitForTimeout(3000);
        await shot(page, 'd9-deck-overview-live.png');

        await page.getByRole('button', { name: 'TIMELINE' }).click();
        await page.waitForTimeout(2500);
        await shot(page, 'd9-deck-timeline.png');

        await page.getByRole('button', { name: '3D ORBIT' }).click();
        await page.waitForTimeout(2500);
        await shot(page, 'd9-deck-orbit.png');

        await page.getByRole('button', { name: 'RINGS' }).click();
        await page.waitForTimeout(2000);
        await shot(page, 'd9-deck-rings.png');
    });

    test('Virtual Office Live then Demo', async ({ page }) => {
        psql(`UPDATE aos_settings SET ui_demo_mode = false WHERE tenant_id = '${TENANT}'`);
        await loginAsAdmin(page);
        await page.goto('/admin/virtual-office', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Live', { exact: true }).first()).toBeVisible({ timeout: 90_000 });
        await page.waitForTimeout(3000);
        await shot(page, 'd9-deck-vo-live.png');

        psql(`UPDATE aos_settings SET ui_demo_mode = true WHERE tenant_id = '${TENANT}'`);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Demo', { exact: true }).first()).toBeVisible({ timeout: 90_000 });
        await page.waitForTimeout(3000);
        await shot(page, 'd9-deck-vo-demo.png');
        psql(`UPDATE aos_settings SET ui_demo_mode = false WHERE tenant_id = '${TENANT}'`);
    });
});
