import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should redirect to login if unauthenticated', async ({ page }) => {
    // Attempt to visit a protected admin route
    await page.goto('/admin/dashboard');

    // Should be redirected to the login page
    await expect(page).toHaveURL(/.*\/login/);
    
    // Check for login elements
    const loginHeader = page.locator('h2', { hasText: 'Sign in to Nusantarasoft' });
    await expect(loginHeader).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in credentials
    await page.fill('input[type="email"]', 'admin@nusantarasoft.com');
    await page.fill('input[type="password"]', 'admin123');

    // Click submit
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);

    // Verify dashboard header is visible
    const dashboardHeader = page.locator('h1', { hasText: 'Dashboard' });
    await expect(dashboardHeader).toBeVisible();
  });
});
