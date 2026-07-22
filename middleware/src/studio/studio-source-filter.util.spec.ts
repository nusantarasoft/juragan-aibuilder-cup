import { describe, expect, it } from 'vitest';
import { filterChunksBySourceIds, isEmptySourceSelection } from './studio-source-filter.util';

describe('filterChunksBySourceIds (UC-29)', () => {
    const hits = [
        { sourceId: 's1', n: 1 },
        { sourceId: 's2', n: 2 },
        { sourceId: 's1', n: 3 },
    ];

    it('returns all hits when sourceIds is undefined (no filter)', () => {
        expect(filterChunksBySourceIds(hits)).toHaveLength(3);
        expect(filterChunksBySourceIds(hits, undefined)).toHaveLength(3);
    });

    it('returns all hits when sourceIds is null (no filter)', () => {
        expect(filterChunksBySourceIds(hits, null)).toHaveLength(3);
    });

    it('returns [] when sourceIds is explicit empty (none selected)', () => {
        expect(filterChunksBySourceIds(hits, [])).toEqual([]);
    });

    it('filters to allowed source ids', () => {
        const filtered = filterChunksBySourceIds(hits, ['s1', 's3']);
        expect(filtered.map((h) => h.n)).toEqual([1, 3]);
    });

    it('returns [] when none of the ids match', () => {
        expect(filterChunksBySourceIds(hits, ['missing'])).toEqual([]);
    });
});

describe('isEmptySourceSelection', () => {
    it('true only for empty array', () => {
        expect(isEmptySourceSelection([])).toBe(true);
        expect(isEmptySourceSelection(undefined)).toBe(false);
        expect(isEmptySourceSelection(null)).toBe(false);
        expect(isEmptySourceSelection(['s1'])).toBe(false);
    });
});
