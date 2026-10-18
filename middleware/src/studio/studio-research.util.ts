import { createHash } from 'crypto';
import { htmlToText, isBlockedImportHost } from './studio-import.util';

/** Official government domains for regulatory research fetch (host suffix match). */
export const RESEARCH_GOVERNMENT_HOST_SUFFIXES = [
    'pajak.go.id',
    'peraturan.go.id',
    'kemenkopukm.go.id',
    'kemenkop.go.id',
    'umkm.go.id',
    'bi.go.id',
    'halal.go.id',
    'oss.go.id',
    'ojk.go.id',
    'kemenkeu.go.id',
] as const;

export type ResearchSourceRecord = {
    url: string;
    fetched_at: string;
    content_sha256: string;
    quoted_snippet: string;
    excerpt_window?: string;
    fetch_error?: string;
};

export type ResearchDedupeHit = {
    chunk_id: string;
    source_id: string;
    filename: string;
    score: number;
    flag: 'mirip/duplikat' | 'mungkin bertentangan';
    content_preview: string;
};

export type ResearchDedupeResult = {
    flags: Array<'mirip/duplikat' | 'mungkin bertentangan'>;
    hits: ResearchDedupeHit[];
};

export function normalizeHost(hostname: string): string {
    return hostname.toLowerCase().replace(/^www\./, '').replace(/^\[|\]$/g, '');
}

/** JDIH portals: jdih.<prov/kab>.go.id */
export function isJdihGoIdHost(host: string): boolean {
    const h = normalizeHost(host);
    return /^jdih\.[a-z0-9.-]+\.go\.id$/.test(h) || h === 'jdih.go.id';
}

export function hostMatchesResearchAllowlist(rawUrl: string): boolean {
    let host: string;
    try {
        host = normalizeHost(new URL(rawUrl).hostname);
    } catch {
        return false;
    }
    if (isJdihGoIdHost(host)) return true;
    return RESEARCH_GOVERNMENT_HOST_SUFFIXES.some(
        (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
}

/** Research fetch guard: block SSRF/private hosts and require government allowlist. */
export function isAllowedResearchUrl(rawUrl: string): boolean {
    if (isBlockedImportHost(rawUrl)) return false;
    let parsed: URL;
    try {
        parsed = new URL(rawUrl);
    } catch {
        return false;
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    return hostMatchesResearchAllowlist(rawUrl);
}

export function sha256Hex(text: string): string {
    return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Verbatim substring check (collapse only internal whitespace runs for fuzzy match fallback off — strict). */
export function quotedSnippetInSource(quoted: string, sourceText: string): boolean {
    const q = (quoted ?? '').trim();
    if (!q || q.length < 8) return false;
    const src = sourceText ?? '';
    if (src.includes(q)) return true;
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
    return norm(src).includes(norm(q));
}

export function validateResearchSources(
    sources: Array<{ url: string; quoted_snippet: string; fetched_at?: string; content_sha256?: string }>,
    fetchedBodies: Map<string, string>,
): { ok: boolean; invalid: Array<{ url: string; reason: string }> } {
    const invalid: Array<{ url: string; reason: string }> = [];
    for (const s of sources) {
        const body = fetchedBodies.get(s.url);
        if (!body) {
            invalid.push({ url: s.url, reason: 'Teks sumber tidak ditemukan' });
            continue;
        }
        if (!quotedSnippetInSource(s.quoted_snippet, body)) {
            invalid.push({ url: s.url, reason: 'Kutipan bukan substring teks sumber' });
        }
    }
    return { ok: invalid.length === 0, invalid };
}

export function classifyDedupeHits(
    hits: Array<{ chunkId: string; sourceId: string; filename: string; content: string; score: number }>,
    duplicateThreshold = 0.88,
    conflictThreshold = 0.78,
): ResearchDedupeResult {
    const flags = new Set<'mirip/duplikat' | 'mungkin bertentangan'>();
    const out: ResearchDedupeHit[] = [];
    for (const h of hits) {
        if (h.score < conflictThreshold) continue;
        const flag: ResearchDedupeHit['flag'] =
            h.score >= duplicateThreshold ? 'mirip/duplikat' : 'mungkin bertentangan';
        flags.add(flag);
        out.push({
            chunk_id: h.chunkId,
            source_id: h.sourceId,
            filename: h.filename,
            score: h.score,
            flag,
            content_preview: (h.content ?? '').slice(0, 280),
        });
    }
    return { flags: [...flags], hits: out };
}

export function htmlOrPlainToText(raw: string, contentType: string): string {
    const ct = (contentType ?? '').toLowerCase();
    if (ct.includes('html')) return htmlToText(raw);
    return raw.replace(/\s+\n/g, '\n').trim();
}

export function buildMergeProvenanceBody(params: {
    title: string;
    summary: string;
    sources: ResearchSourceRecord[];
    researchItemId: string;
    approver: string;
    effectiveDate?: string | null;
}): string {
    const lines: string[] = [
        `[Riset Knowledge UMKM — disetujui]`,
        `Judul: ${params.title}`,
        `ID riset: ${params.researchItemId}`,
        `Disetujui oleh: ${params.approver}`,
        params.effectiveDate ? `Tanggal berlaku: ${params.effectiveDate}` : '',
        '',
        '--- Ringkasan ---',
        params.summary,
        '',
        '--- Sumber & kutipan ---',
    ].filter(Boolean) as string[];

    for (const s of params.sources) {
        lines.push(`URL: ${s.url}`);
        lines.push(`Diambil: ${s.fetched_at}`);
        lines.push(`Kutipan: "${s.quoted_snippet}"`);
        lines.push('');
    }
    return lines.join('\n').slice(0, 500_000);
}

/** Parse LLM JSON payload for research summarization. */
export function parseResearchLlmJson(raw: string): {
    title?: string;
    summary?: string;
    effective_date?: string | null;
    sources?: Array<{ url: string; quoted_snippet: string }>;
} | null {
    const trimmed = raw.trim();
    const jsonBlock = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
    const candidate = jsonBlock?.[1]?.trim() ?? trimmed;
    try {
        return JSON.parse(candidate) as ReturnType<typeof parseResearchLlmJson>;
    } catch {
        const start = candidate.indexOf('{');
        const end = candidate.lastIndexOf('}');
        if (start >= 0 && end > start) {
            try {
                return JSON.parse(candidate.slice(start, end + 1));
            } catch {
                return null;
            }
        }
        return null;
    }
}
