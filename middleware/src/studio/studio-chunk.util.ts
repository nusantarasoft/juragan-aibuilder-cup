/** Split text into overlapping chunks for embedding (character-based). */
export function chunkText(
    text: string,
    chunkSize = 1200,
    overlap = 150,
): string[] {
    const normalized = text.replace(/\r\n/g, '\n').trim();
    if (!normalized) return [];
    if (normalized.length <= chunkSize) return [normalized];

    const chunks: string[] = [];
    let start = 0;
    while (start < normalized.length) {
        let end = Math.min(start + chunkSize, normalized.length);
        if (end < normalized.length) {
            const slice = normalized.slice(start, end);
            const breakAt = Math.max(
                slice.lastIndexOf('\n\n'),
                slice.lastIndexOf('\n'),
                slice.lastIndexOf('. '),
            );
            if (breakAt > chunkSize * 0.4) {
                end = start + breakAt + 1;
            }
        }
        const piece = normalized.slice(start, end).trim();
        if (piece) chunks.push(piece);
        if (end >= normalized.length) break;
        start = Math.max(end - overlap, start + 1);
    }
    return chunks;
}
