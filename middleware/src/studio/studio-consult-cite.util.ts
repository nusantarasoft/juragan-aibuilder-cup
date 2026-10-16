/**
 * PDF page locus from extracted chunk text (pdf-parse often leaves "-- N of M --").
 * Not a perfect page map — good enough for WA cite "hlm. N" without re-ingest.
 */

const PAGE_OF_RE = /--\s*(\d+)\s+of\s+\d+\s*--/gi;
const HALAMAN_RE = /\b(?:hal\.?|hlm\.?|halaman)\s*(\d{1,4})\b/gi;

/** Unique page numbers found in chunk content, ascending. */
export function extractPdfPagesFromChunk(content: string): number[] {
    const found = new Set<number>();
    const text = content || '';
    for (const re of [PAGE_OF_RE, HALAMAN_RE]) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
            const n = parseInt(m[1], 10);
            if (n > 0 && n < 10000) found.add(n);
        }
    }
    return [...found].sort((a, b) => a - b);
}

/** First page hint for a chunk, or null. */
export function primaryPdfPageFromChunk(content: string): number | null {
    const pages = extractPdfPagesFromChunk(content);
    return pages.length ? pages[0]! : null;
}

/** Format "hlm. 12" or "hlm. 12–14" for WA cite. */
export function formatHlmCite(pages: number[]): string {
    const uniq = [...new Set(pages.filter((n) => n > 0))].sort((a, b) => a - b);
    if (!uniq.length) return '';
    if (uniq.length === 1) return `hlm. ${uniq[0]}`;
    if (uniq.length === 2) return `hlm. ${uniq[0]}–${uniq[1]}`;
    return `hlm. ${uniq[0]}–${uniq[uniq.length - 1]}`;
}

/**
 * Ensure answer ends with a light book cite including hlm when available.
 * When `pages` is empty, strip any invented hlm/halaman from book cites.
 */
export function ensureConsultBookCite(answer: string, pages: number[]): string {
    let text = (answer || '').trim();
    if (!text) return text;
    const hlm = formatHlmCite(pages);
    if (!hlm) {
        text = text
            .replace(
                /\(dari buku manajemen ukm,\s*(?:hlm\.?|hal\.?|halaman)\s*[\d.,–\-—\s]+\)\.?/gi,
                '(dari buku Manajemen UKM)',
            )
            .replace(
                /,\s*(?:hlm\.?|hal\.?|halaman)\s*[\d.,–\-—]+(?=\))/gi,
                '',
            );
    }
    if (/dari buku manajemen ukm/i.test(text)) {
        if (!hlm || /\bhlm\.?\s*\d/i.test(text) || /\bhalaman\s*\d/i.test(text)) {
            return text;
        }
        // Upgrade existing book cite with hlm.
        return text.replace(
            /\(dari buku manajemen ukm\)\.?$/i,
            `(dari buku Manajemen UKM, ${hlm})`,
        );
    }
    const suffix = hlm
        ? `(dari buku Manajemen UKM, ${hlm})`
        : '(dari buku Manajemen UKM)';
    return `${text}\n\n${suffix}`.trim();
}
