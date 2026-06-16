/** Pure helpers for NotebookLM source checkbox selection (UC-29). */

export function syncSelectedSourceIds(prev: string[], indexedIds: string[]): string[] {
    const kept = prev.filter((id) => indexedIds.includes(id));
    return kept.length > 0 ? kept : indexedIds;
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
