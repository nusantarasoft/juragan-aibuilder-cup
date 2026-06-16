import { describe, expect, it } from 'vitest';
import {
    indexedSourceIds,
    selectAllSourceIds,
    shouldAutoGenerateBrief,
    syncSelectedSourceIds,
    toggleSourceId,
} from './notebookSourceSelection';

describe('notebookSourceSelection (UC-29, UC-31)', () => {
    const indexed = ['a', 'b', 'c'];

    it('syncSelectedSourceIds keeps valid selection or defaults to all indexed', () => {
        expect(syncSelectedSourceIds(['a', 'x'], indexed)).toEqual(['a']);
        expect(syncSelectedSourceIds([], indexed)).toEqual(indexed);
        expect(syncSelectedSourceIds(['a', 'b'], indexed)).toEqual(['a', 'b']);
    });

    it('toggleSourceId adds or removes id', () => {
        expect(toggleSourceId(['a'], 'b', true)).toEqual(['a', 'b']);
        expect(toggleSourceId(['a', 'b'], 'a', false)).toEqual(['b']);
    });

    it('selectAllSourceIds selects or clears indexed ids', () => {
        expect(selectAllSourceIds(true, indexed)).toEqual(indexed);
        expect(selectAllSourceIds(false, indexed)).toEqual([]);
    });

    it('indexedSourceIds only includes done sources with chunks', () => {
        const ids = indexedSourceIds([
            { id: '1', parse_status: 'done', chunk_count: 3 },
            { id: '2', parse_status: 'parsing', chunk_count: 0 },
            { id: '3', parse_status: 'done', chunk_count: 0 },
        ]);
        expect(ids).toEqual(['1']);
    });

    it('shouldAutoGenerateBrief when all indexed and no brief yet', () => {
        expect(
            shouldAutoGenerateBrief({
                allIndexed: true,
                indexedCount: 2,
                alreadyTriggered: false,
                hasBrief: false,
            }),
        ).toBe(true);
        expect(
            shouldAutoGenerateBrief({
                allIndexed: true,
                indexedCount: 2,
                alreadyTriggered: true,
                hasBrief: false,
            }),
        ).toBe(false);
        expect(
            shouldAutoGenerateBrief({
                allIndexed: true,
                indexedCount: 2,
                alreadyTriggered: false,
                hasBrief: true,
            }),
        ).toBe(false);
    });
});
