import { test, expect } from '@playwright/test';
import path from 'path';

const GRAPHQL = process.env.GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';
const MEDIA_DIR = process.env.F37_MEDIA_DIR || '/cursor/stores/self/media';

async function gql<T>(query: string, variables?: Record<string, unknown>, token?: string): Promise<T> {
    const res = await fetch(GRAPHQL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors?.length) throw new Error(json.errors[0].message);
    return json.data as T;
}

test.describe.configure({ timeout: 180_000 });

test.describe('F3-7 DevOps recruit (live stack)', () => {
    test('register → DevOps live on recruit catalog and recruitable', async ({ page }) => {
        const shot = (name: string) =>
            page.screenshot({ path: path.join(MEDIA_DIR, `f3-7-devops-${name}.png`), fullPage: true });

        const email = `f37-${Date.now()}@example.com`;
        const password = 'Password123!';
        const storeName = `Dev ${Date.now().toString().slice(-4)}`;

        await page.goto('/register');
        await page.getByPlaceholder('Warung Bahagia').fill(storeName);
        await page.getByPlaceholder('owner@example.com').fill(email);
        await page.locator('input[type="password"]').fill(password);
        await page.getByRole('button', { name: /Buat akun trial/i }).click();
        await page.waitForURL((url) => url.pathname === '/admin/virtual-office', { timeout: 60_000 });
        await expect
            .poll(async () => page.evaluate(() => localStorage.getItem('auth_access_token')?.split('.').length ?? 0))
            .toBe(3);

        await page.goto('/admin/recruit');
        await expect(page.getByRole('heading', { name: /Rekrut karyawan/i })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'DevOps' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Rekrut sekarang/i })).toHaveCount(7);
        await expect(page.getByRole('heading', { name: 'Security' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Facilities' })).toBeVisible();
        await expect(page.getByText('Segera hadir').first()).toBeVisible();
        await shot('recruit-page');

        const recruitButtons = page.getByRole('button', { name: /Rekrut sekarang/i });
        await recruitButtons.first().click();
        await page.waitForURL((url) => url.pathname === '/admin/connect-wa', { timeout: 60_000 });

        await page.goto('/admin/recruit');
        await recruitButtons.first().click();
        await page.waitForURL((url) => url.pathname === '/admin/virtual-office', { timeout: 60_000 });

        await page.goto('/admin/recruit');
        const devopsCard = page.locator('li').filter({ has: page.getByRole('heading', { name: 'DevOps' }) });
        await devopsCard.getByRole('button', { name: /Rekrut sekarang/i }).click();
        await page.waitForURL((url) => url.pathname === '/admin/virtual-office', { timeout: 60_000 });
        await expect(page.getByText('DevOps').first()).toBeVisible({ timeout: 60_000 });
        await page.goto('/admin/recruit');
        await expect(
            page.locator('li').filter({ has: page.getByRole('heading', { name: 'DevOps' }) }).getByText('Sudah direkrut'),
        ).toBeVisible({ timeout: 60_000 });
        await shot('recruit-after-devops');

        const token = await page.evaluate(() => localStorage.getItem('auth_access_token'));
        expect(token).toBeTruthy();
        const status = await gql<{ aosRecruitStatus: { devopsRecruited: boolean } }>(
            `query { aosRecruitStatus { devopsRecruited kasirRecruited serviceDeskRecruited financeRecruited salesRecruited } }`,
            undefined,
            token!,
        );
        expect(status.aosRecruitStatus.devopsRecruited).toBe(true);

        const agents = await gql<{ aosAgents: { slug: string; name: string; modules: string[]; tools: string[] }[] }>(
            `query { aosAgents { slug name modules tools } }`,
            undefined,
            token!,
        );
        const devops = agents.aosAgents.find((a) => a.slug === 'devops' || a.slug.startsWith('devops-'));
        expect(devops).toBeTruthy();
        expect(devops?.modules).toEqual(expect.arrayContaining(['devops', 'infrastructure', 'ops']));
        expect(devops?.tools).toEqual(expect.arrayContaining(['pipeline.trigger', 'runbook.execute']));
    });

    test('unauthenticated recruit status rejected', async () => {
        const res = await fetch(GRAPHQL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: '{ aosRecruitStatus { devopsRecruited } }' }),
        });
        const json = await res.json();
        expect(json.errors?.[0]?.message).toMatch(/authentication|sign in/i);
    });
});
