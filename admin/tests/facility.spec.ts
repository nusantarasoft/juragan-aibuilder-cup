import { test, expect } from '@playwright/test';

test.describe('Facility Management Critical Path', () => {
  // Test the Global Command Center
  test('Command Center renders telemetry KPIs and AI Copilot', async ({ page }) => {
    // Navigate directly to the facility dashboard
    await page.goto('http://localhost:3000/admin/facility');
    
    // Check if the glassmorphism layout rendered
    await expect(page.getByText('Global Command Center')).toBeVisible();
    await expect(page.getByText('Unified Facility Intelligence')).toBeVisible();

    // Check KPIs
    await expect(page.getByText('Facility PUE')).toBeVisible();
    await expect(page.getByText('Total Power Load')).toBeVisible();

    // Check AI Copilot
    const aiButton = page.locator('button').filter({ has: page.locator('.anticon-robot') }).last();
    await expect(aiButton).toBeVisible();
    await aiButton.click();
    await expect(page.getByText('Facility AI Copilot')).toBeVisible();
    
    // Close Copilot
    const closeBtn = page.locator('.anticon-close').first();
    if (await closeBtn.isVisible()) {
        await closeBtn.click();
    }
  });

  test('Predictive Maintenance renders PoF tables', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/scada/predictive');
    
    await expect(page.getByText('Asset Health Overview')).toBeVisible();
    await expect(page.getByText('Chiller Plant 2')).toBeVisible();
    await expect(page.getByText('LLM Root Cause Analysis')).toBeVisible();
  });

  test('Automated Reporting page allows PDF export', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/facility/reports');
    
    await expect(page.getByText('Automated Reporting')).toBeVisible();
    await expect(page.getByRole('button', { name: /Export as PDF/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export as Excel/i })).toBeVisible();
  });
});
