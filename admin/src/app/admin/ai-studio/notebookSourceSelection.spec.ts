import { describe, expect, it } from 'vitest';
import {
    indexedSourceIds,
    resolveChatSourceIds,
    selectAllSourceIds,
    shouldAutoGenerateBrief,
    syncSelectedSourceIds,
    toggleSourceId,
} from './notebookSourceSelection';

describe('notebookSourceSelection (UC-29, UC-31)', () => {
    const indexed = ['a', 'b', 'c'];

    describe('syncSelectedSourceIds', () => {
        it('on first load (no previous indexed) selects all currently indexed', () => {
            expect(syncSelectedSourceIds([], indexed, [])).toEqual(indexed);
        });

        it('keeps valid selection and drops stale ids', () => {
            expect(syncSelectedSourceIds(['a', 'x'], indexed, indexed)).toEqual(['a']);
            expect(syncSelectedSourceIds(['a', 'b'], indexed, indexed)).toEqual(['a', 'b']);
        });

        it('preserves intentional empty selection when nothing new indexed', () => {
            expect(syncSelectedSourceIds([], indexed, indexed)).toEqual([]);
        });

        it('auto-selects newly indexed sources even if selection was empty', () => {
            expect(syncSelectedSourceIds([], ['a', 'b', 'c'], ['a', 'b'])).toEqual(['c']);
            expect(syncSelectedSourceIds(['a'], ['a', 'b', 'c'], ['a', 'b'])).toEqual(['a', 'c']);
        });

        it('defaults previouslyIndexedIds to []', () => {
            expect(syncSelectedSourceIds([], ['a'])).toEqual(['a']);
        });
    });

    it('resolveChatSourceIds copies selection including empty (means none, not all)', () => {
        expect(resolveChatSourceIds([])).toEqual([]);
        expect(resolveChatSourceIds(['a', 'b'])).toEqual(['a', 'b']);
        const src = ['a'];
        const out = resolveChatSourceIds(src);
        expect(out).toEqual(src);
        expect(out).not.toBe(src);
    });

    it('toggleSourceId adds or removes id', () => {
        expect(toggleSourceId(['a'], 'b', true)).toEqual(['a', 'b']);
        expect(toggleSourceId(['a', 'b'], 'a', false)).toEqual(['b']);
        expect(toggleSourceId(['a'], 'a', true)).toEqual(['a']);
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
            { id: '4', parse_status: 'done' },
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
        expect(
            shouldAutoGenerateBrief({
                allIndexed: false,
                indexedCount: 2,
                alreadyTriggered: false,
                hasBrief: false,
            }),
        ).toBe(false);
        expect(
            shouldAutoGenerateBrief({
                allIndexed: true,
                indexedCount: 0,
                alreadyTriggered: false,
                hasBrief: false,
            }),
        ).toBe(false);
    });
});
