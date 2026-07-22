/**
 * Filter semantic-search hits by selected notebook source IDs (UC-29).
 *
 * Semantics (NotebookLM-aligned):
 * - `undefined` → no filter (all notebook sources)
 * - `[]` → explicitly none (return empty)
 * - `['id', ...]` → keep only those source ids
 */

export type ChunkSourceRef = { sourceId: string };

export function filterChunksBySourceIds<T extends ChunkSourceRef>(
    hits: T[],
    sourceIds?: string[] | null,
): T[] {
    if (sourceIds === undefined || sourceIds === null) return hits;
    if (sourceIds.length === 0) return [];
    const allowed = new Set(sourceIds);
    return hits.filter((c) => allowed.has(c.sourceId));
}

/** True when the caller intentionally selected zero sources. */
export function isEmptySourceSelection(sourceIds?: string[] | null): boolean {
    return Array.isArray(sourceIds) && sourceIds.length === 0;
}
