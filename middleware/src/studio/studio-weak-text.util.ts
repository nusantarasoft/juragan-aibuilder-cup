/**
 * Detect placeholder / junk extraction output that must not be chunked or embedded.
 * Shared by ingestion so "Document: file (too large…)" style stubs fail loudly.
 */

export function isWeakExtractedText(text: string, filename = ''): boolean {
    const t = text.trim();
    if (!t) return true;
    if (t.length < 40) return true;

    // Exact RAG placeholder: "Document: {filename}"
    if (filename) {
        const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`^Document:\\s*${escaped}\\s*$`, 'i').test(t)) return true;
    }

    // Any Document: stub (incl. "(too large to extract inline)")
    if (/^Document:\s*.+/i.test(t) && t.length < 200) return true;
    if (/\(too large to extract inline\)/i.test(t)) return true;

    // Mostly non-printable / replacement garbage
    const printable = t.replace(/[\s\p{L}\p{N}\p{P}\p{S}]/gu, '');
    if (printable.length / t.length > 0.3) return true;

    return false;
}
