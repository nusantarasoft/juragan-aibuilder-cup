/**
 * Pure helpers for inline citation markers in Studio chat answers.
 * Kept separate from React so they can be unit-tested without a DOM.
 */

export type CitationRef = {
    content: string;
    docName: string;
    score: number;
    chunkId?: string;
};

/**
 * Rewrite `[n]` markers into markdown links pointing at `#studio-cite-n`
 * when `n` is in range of `references`. Out-of-range markers are left as-is.
 */
export function rewriteInlineCitations(content: string, references?: CitationRef[] | null): string {
    if (!references?.length) return content;
    return content.replace(/\[(\d{1,2})\]/g, (m, n) => {
        const idx = Number(n);
        return idx >= 1 && idx <= references.length ? `[${n}](#studio-cite-${n})` : m;
    });
}

/** Parse a `#studio-cite-n` href back to a 0-based reference index, or null. */
export function citationIndexFromHref(href?: string | null): number | null {
    const match = /^#studio-cite-(\d+)$/.exec(href || "");
    if (!match) return null;
    const n = Number(match[1]);
    return Number.isFinite(n) && n >= 1 ? n - 1 : null;
}

/** Find the last user message content in a chat history (for regenerate). */
export function findLastUserContent(
    history: { role: string; content: string }[],
): string | null {
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].role === "user" && history[i].content.trim()) {
            return history[i].content;
        }
    }
    return null;
}

/** Drop trailing assistant messages so a regenerated answer can replace them. */
export function dropTrailingAssistants<T extends { role: string }>(history: T[]): T[] {
    const copy = [...history];
    while (copy.length && copy[copy.length - 1].role === "assistant") copy.pop();
    return copy;
}
