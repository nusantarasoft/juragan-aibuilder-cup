import { describe, expect, it } from 'vitest';
import { filterChunksBySourceIds } from './studio-source-filter.util';

describe('filterChunksBySourceIds (UC-29)', () => {
    const hits = [
        { sourceId: 's1', content: 'a' },
        { sourceId: 's2', content: 'b' },
        { sourceId: 's3', content: 'c' },
    ];

    it('returns all hits when no sourceIds filter', () => {
        expect(filterChunksBySourceIds(hits)).toHaveLength(3);
        expect(filterChunksBySourceIds(hits, [])).toHaveLength(3);
    });

    it('filters to allowed source ids only', () => {
        const filtered = filterChunksBySourceIds(hits, ['s1', 's3']);
        expect(filtered.map((h) => h.sourceId)).toEqual(['s1', 's3']);
    });

    it('returns empty when no hits match filter', () => {
        expect(filterChunksBySourceIds(hits, ['missing'])).toEqual([]);
    });
});
