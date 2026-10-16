import { describe, expect, it } from 'vitest';
import { allAdminCrawlPaths, collectMenuPaths } from './collectAdminMenuPaths';

describe('collectAdminMenuPaths', () => {
    it('collects nested admin paths', () => {
        const paths = collectMenuPaths([
            { path: '/admin/a', children: [{ path: '/admin/a/1' }] },
            { path: '/admin/b' },
        ]);
        expect(paths).toEqual(['/admin/a', '/admin/a/1', '/admin/b']);
    });

    it('includes menu + VO module routes', () => {
        const paths = allAdminCrawlPaths();
        expect(paths.length).toBeGreaterThan(50);
        expect(paths).toContain('/admin/dashboard');
        expect(paths).toContain('/admin/virtual-office');
        expect(paths).toContain('/admin/analytics/metrics');
    });
});
