import { describe, expect, it } from 'vitest';
import { isPlatformMetricsLive } from './platformMetricsView';

describe('platformMetricsView', () => {
    it('detects live Prometheus summary', () => {
        expect(isPlatformMetricsLive({ available: true, targetsUp: 1, targetsDown: 0, targets: [] })).toBe(true);
    });

    it('treats unavailable as not live', () => {
        expect(isPlatformMetricsLive({ available: false, reason: 'down' })).toBe(false);
        expect(isPlatformMetricsLive(null)).toBe(false);
    });
});
