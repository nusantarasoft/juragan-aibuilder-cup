import { describe, expect, it } from 'vitest';
import { buildTrendChartRows, scadaTrendsUsingLiveHistory } from './scadaTrendsView';

describe('scadaTrendsView', () => {
    it('builds chart rows from historian points', () => {
        const rows = buildTrendChartRows([
            {
                id: '1',
                tagId: 'tag-a',
                timestamp: '2026-10-16T10:00:00.000Z',
                valueNumeric: 22.5,
            },
            {
                id: '2',
                tagId: 'tag-b',
                timestamp: '2026-10-16T10:00:00.000Z',
                valueNumeric: 48,
            },
        ]);
        expect(rows).toHaveLength(1);
        expect(rows[0]['tag-a']).toBe(22.5);
        expect(rows[0]['tag-b']).toBe(48);
    });

    it('flags live mode when points exist', () => {
        expect(scadaTrendsUsingLiveHistory(0)).toBe(false);
        expect(scadaTrendsUsingLiveHistory(3)).toBe(true);
    });
});
