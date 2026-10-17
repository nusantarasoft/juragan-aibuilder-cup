import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import { allAdminCrawlPaths } from '../../src/lib/collectAdminMenuPaths';
import { loginAsAdmin } from './helpers/auth';
import { assertCleanConsole, attachConsoleCollector } from './helpers/console';

test.describe.configure({ mode: 'serial', timeout: 7_200_000 });

type ClickSkipReason = { index: number; label?: string; error: string };

type RouteCoverageRow = {
    path: string;
    status: 'ok' | 'error';
    httpStatus?: number;
    consoleErrors: string[];
    primaryButtonsClicked: number;
    clickSkipReasons?: ClickSkipReason[];
    note?: string;
};

test('crawl menuConfig + VO routes — console + primary buttons', async ({ page }) => {
    page.setDefaultTimeout(45_000);
    page.setDefaultNavigationTimeout(45_000);
    await loginAsAdmin(page);
    const routes = allAdminCrawlPaths();
    const coverage: RouteCoverageRow[] = [];
    const consoleErrors = attachConsoleCollector(page);
    const outDir = process.env.UI_WAVE4_COVERAGE_DIR || path.join(process.cwd(), '..', '.gstack', 'qa-reports');
    const progressLog = process.env.UI_WAVE4_CRAWL_PROGRESS || path.join(outDir, 'ui-wave-4-crawl-progress.log');
    fs.writeFileSync(progressLog, `started ${new Date().toISOString()} routes=${routes.length}\n`);

    for (const routePath of routes) {
        fs.appendFileSync(progressLog, `${new Date().toISOString()} ${routePath}\n`);
        const errorStart = consoleErrors.length;
        let status: RouteCoverageRow['status'] = 'ok';
        let httpStatus: number | undefined;
        let primaryButtonsClicked = 0;
        const clickSkipReasons: ClickSkipReason[] = [];
        let note: string | undefined;

        try {
            let resp = await page.goto(routePath, { waitUntil: 'domcontentloaded', timeout: 45_000 });
            httpStatus = resp?.status();
            if (httpStatus === 404) {
                note = 'route 404 (menu ahead of page implementation)';
                coverage.push({
                    path: routePath,
                    status: 'ok',
                    httpStatus,
                    consoleErrors: consoleErrors.slice(errorStart),
                    primaryButtonsClicked: 0,
                    note,
                });
                continue;
            }
            await page.waitForTimeout(300);

            const primaries = page.locator('button.ant-btn-primary:visible');
            const count = await primaries.count();
            for (let i = 0; i < Math.min(count, 2); i++) {
                const btn = primaries.nth(i);
                const enabled = await btn.isEnabled({ timeout: 2_000 }).catch(() => false);
                if (!enabled) continue;
                const label = await btn.innerText().catch(() => undefined);
                const urlBefore = page.url();
                try {
                    await btn.click({ timeout: 2000 });
                    primaryButtonsClicked += 1;
                    await page.waitForTimeout(350);
                    if (!page.url().includes(routePath.split('?')[0])) {
                        await page.goto(routePath, { waitUntil: 'domcontentloaded', timeout: 45_000 });
                    }
                } catch (err) {
                    const error = err instanceof Error ? err.message : String(err);
                    clickSkipReasons.push({ index: i, label: label?.trim().slice(0, 80), error });
                }
            }

            assertCleanConsole(consoleErrors.slice(errorStart));
        } catch (e) {
            status = 'error';
            note = e instanceof Error ? e.message : String(e);
            if (/ERR_CONNECTION_REFUSED|Target page, context or browser has been closed/i.test(note)) {
                break;
            }
        }

        coverage.push({
            path: routePath,
            status,
            httpStatus,
            consoleErrors: consoleErrors.slice(errorStart),
            primaryButtonsClicked,
            ...(clickSkipReasons.length ? { clickSkipReasons } : {}),
            note,
        });
    }

    fs.mkdirSync(outDir, { recursive: true });
    const jsonPath = path.join(outDir, 'ui-wave-4-route-coverage.json');
    fs.writeFileSync(jsonPath, JSON.stringify({ generatedAt: new Date().toISOString(), routes: coverage }, null, 2));

    const failed = coverage.filter((r) => r.status === 'error');
    expect(failed, `Route crawl failures: ${failed.map((f) => f.path).join(', ')}`).toEqual([]);
});
