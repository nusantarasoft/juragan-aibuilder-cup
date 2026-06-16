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

test.describe('AI Studio — Studio page', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/ai-studio');
        await expect(page).toHaveURL(/\/admin\/ai-studio/);
    });

    test('renders AI Assistant with chat mode controls', async ({ page }) => {
        await expect(page.getByText('AI Assistant', { exact: true })).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText('Chat bebas')).toBeVisible();
        await expect(page.getByText('Guided')).toBeVisible();
    });

    test('shows workspace tabs: Workspace, Playground, Guide flows', async ({ page }) => {
        await expect(page.getByRole('tab', { name: /Workspace/i })).toBeVisible();
        await expect(page.getByRole('tab', { name: /Playground/i })).toBeVisible();
        await expect(page.getByRole('tab', { name: /Guide flows/i })).toBeVisible();
    });

    test('opens Playground tab and shows prompt fields', async ({ page }) => {
        await page.getByRole('tab', { name: /Playground/i }).click();
        await expect(page.getByText(/System prompt|system prompt/i).first()).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(/User prompt|user prompt/i).first()).toBeVisible();
    });

    test('opens Guide flows tab with template actions', async ({ page }) => {
        await page.getByRole('tab', { name: /Guide flows/i }).click();
        await expect(page.getByRole('button', { name: /New flow/i })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(/best practices|Guide Flow/i).first()).toBeVisible();
    });

    test('Sources panel visible in sidebar', async ({ page }) => {
        await expect(page.getByText(/Sources|Sumber/i).first()).toBeVisible({ timeout: 10_000 });
    });
});
