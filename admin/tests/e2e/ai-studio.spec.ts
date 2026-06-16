import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@nusantarasoft.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'admin123';

async function loginAsAdmin(page: import('@playwright/test').Page) {
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin\//);
}

test.describe('AI Studio — NotebookLM layout', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/ai-studio');
        await expect(page).toHaveURL(/\/admin\/ai-studio/);
    });

    test('renders 3-column layout: Sources, Chat, Studio', async ({ page }) => {
        await expect(page.getByText('Sources', { exact: true })).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText('Chat bebas')).toBeVisible();
        await expect(page.getByText('Studio', { exact: true })).toBeVisible();
    });

    test('notebook dropdown in header', async ({ page }) => {
        await expect(page.getByRole('combobox').first()).toBeVisible({ timeout: 15_000 });
    });

    test('Studio panel shows generate tiles', async ({ page }) => {
        await expect(page.getByText('Brief', { exact: true })).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText('Mind Map', { exact: true })).toBeVisible();
        await expect(page.getByText('Quiz', { exact: true })).toBeVisible();
    });

    test('Sources panel has configure and import actions', async ({ page }) => {
        const sources = page.locator('text=Sources').first();
        await expect(sources).toBeVisible({ timeout: 15_000 });
        await expect(page.getByRole('button', { name: /setting/i }).first()).toBeVisible();
    });
});

test.describe('AI Studio — Advanced pages', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('Playground advanced page loads', async ({ page }) => {
        await page.goto('/admin/ai-studio/advanced/playground');
        await expect(page.getByText(/System Prompt/i).first()).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText(/User Prompt/i).first()).toBeVisible();
    });

    test('Guide flows advanced page loads', async ({ page }) => {
        await page.goto('/admin/ai-studio/advanced/guide-flows');
        await expect(page.getByText(/Guide Flow|guide flow/i).first()).toBeVisible({ timeout: 15_000 });
    });
});
