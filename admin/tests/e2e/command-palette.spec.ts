import { test, expect } from '@playwright/test';

test.describe('Command Palette (Cmd+K)', () => {
  test.beforeEach(async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@nusantarasoft.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);
  });

  test('should open command palette and filter results', async ({ page }) => {
    // Determine the modifier key based on OS (Playwright defaults to Mac or PC depending on runner)
    // We can simulate the shortcut using page.keyboard.press
    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+K' : 'Control+K');

    // Wait for the Command Palette input to appear
    const cmdInput = page.locator('input[placeholder="Search tasks, projects, tickets, pages..."]');
    await expect(cmdInput).toBeVisible();

    // Type a query for a facility module
    await cmdInput.fill('cctv');

    // Wait for the list to filter
    // The "CCTV Live" item should be visible in the results
    const cctvResult = page.locator('[cmdk-item]', { hasText: 'CCTV Live' });
    await expect(cctvResult).toBeVisible();

    // Press down arrow and enter to navigate to it
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Should have navigated to the CCTV page
    await expect(page).toHaveURL(/.*\/admin\/bms\/cctv/);
  });
});
