import { test, expect } from '@playwright/test';

test.describe('Global Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authenticated state by logging in
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@nusantarasoft.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);
  });

  test('should navigate between major modules using sidebar', async ({ page }) => {
    // 1. Navigate to Project Management -> Projects
    await page.click('span:has-text("Project Management")');
    await page.click('a[href="/admin/pm/projects"]');
    await expect(page).toHaveURL(/.*\/admin\/pm\/projects/);
    await expect(page.locator('h1', { hasText: 'Projects' })).toBeVisible();

    // 2. Navigate to Facility Management -> DCIM 3D View
    await page.click('span:has-text("Facility Management")');
    await page.click('a[href="/admin/dcim/3d-view"]');
    await expect(page).toHaveURL(/.*\/admin\/dcim\/3d-view/);

    // Verify the canvas rendered (usually indicated by a specific container class or id)
    // Here we check that the main layout is active.
    const canvasContainer = page.locator('.ant-layout-content');
    await expect(canvasContainer).toBeVisible();

    // 3. Navigate to ITSM -> Tickets
    await page.click('span:has-text("ITSM")');
    await page.click('a[href="/admin/itsm/tickets"]');
    await expect(page).toHaveURL(/.*\/admin\/itsm\/tickets/);
    await expect(page.locator('h1', { hasText: 'Tickets' })).toBeVisible();
  });
});
