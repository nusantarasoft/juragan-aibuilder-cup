/** Filter semantic-search hits by selected notebook source IDs (UC-29). */

export type ChunkSourceRef = { sourceId: string };

export function filterChunksBySourceIds<T extends ChunkSourceRef>(
    hits: T[],
    sourceIds?: string[],
): T[] {
    if (!sourceIds?.length) return hits;
    const allowed = new Set(sourceIds);
    return hits.filter((c) => allowed.has(c.sourceId));
}
