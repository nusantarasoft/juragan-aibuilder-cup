/** Pure helpers for NotebookLM source checkbox selection (UC-29). */

/**
 * Sync checkbox selection after a source-list refresh.
 *
 * - Drops ids that are no longer indexed.
 * - Auto-selects **newly** indexed ids (NotebookLM: new sources start checked).
 * - Does **not** re-expand an intentional empty selection when nothing new appeared
 *   (uncheck-all stays empty until a new source finishes indexing).
 *
 * Pass `previouslyIndexedIds` from the previous sync (empty on notebook switch)
 * so the first load treats all current indexed ids as "new" → select all.
 */
export function syncSelectedSourceIds(
    prev: string[],
    indexedIds: string[],
    previouslyIndexedIds: string[] = [],
): string[] {
    const indexedSet = new Set(indexedIds);
    const kept = prev.filter((id) => indexedSet.has(id));
    const previouslyIndexed = new Set(previouslyIndexedIds);
    const newlyIndexed = indexedIds.filter((id) => !previouslyIndexed.has(id));
    return [...new Set([...kept, ...newlyIndexed])];
}

/** Ids to send to chat/output APIs. Empty array means "no sources" (not "all"). */
export function resolveChatSourceIds(selectedSourceIds: string[]): string[] {
    return [...selectedSourceIds];
}

export function toggleSourceId(ids: string[], sourceId: string, checked: boolean): string[] {
    return checked ? [...new Set([...ids, sourceId])] : ids.filter((id) => id !== sourceId);
}

export function selectAllSourceIds(checked: boolean, indexedIds: string[]): string[] {
    return checked ? [...indexedIds] : [];
}

export function indexedSourceIds(
    sources: { id: string; parse_status: string; chunk_count?: number }[],
): string[] {
    return sources
        .filter((s) => s.parse_status === 'done' && (s.chunk_count ?? 0) > 0)
        .map((s) => s.id);
}

export function shouldAutoGenerateBrief(params: {
    allIndexed: boolean;
    indexedCount: number;
    alreadyTriggered: boolean;
    hasBrief: boolean;
}): boolean {
    const { allIndexed, indexedCount, alreadyTriggered, hasBrief } = params;
    return allIndexed && indexedCount > 0 && !alreadyTriggered && !hasBrief;
}
