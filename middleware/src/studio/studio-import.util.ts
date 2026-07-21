/**
 * Pure helpers for importing external URLs as Studio sources.
 *
 * Kept free of network/IO so they can be unit-tested. The service layer wires
 * these into fetch() calls (see StudioService.importUrl).
 */

export type ImportKind = 'youtube' | 'google_doc' | 'google_slides' | 'web';

/** Classify a URL to pick the right extraction strategy. */
export function detectImportKind(rawUrl: string): ImportKind {
    let host = '';
    let path = '';
    try {
        const u = new URL(rawUrl);
        host = u.hostname.toLowerCase().replace(/^www\./, '');
        path = u.pathname.toLowerCase();
    } catch {
        return 'web';
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
        return 'youtube';
    }
    if (host === 'docs.google.com') {
        if (path.startsWith('/presentation/')) return 'google_slides';
        if (path.startsWith('/document/')) return 'google_doc';
    }
    return 'web';
}

/** Extract a YouTube video id from watch/short/embed URLs. Returns null if none. */
export function youtubeVideoId(rawUrl: string): string | null {
    let u: URL;
    try {
        u = new URL(rawUrl);
    } catch {
        return null;
    }
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') {
        const id = u.pathname.slice(1).split('/')[0];
        return /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
        const v = u.searchParams.get('v');
        if (v && /^[\w-]{11}$/.test(v)) return v;
        const parts = u.pathname.split('/').filter(Boolean);
        // /embed/<id> or /shorts/<id>
        if ((parts[0] === 'embed' || parts[0] === 'shorts') && /^[\w-]{11}$/.test(parts[1] ?? '')) {
            return parts[1];
        }
    }
    return null;
}

/**
 * Convert a Google Docs/Slides URL to its plain-text export endpoint. Works for
 * publicly shared documents. Returns null when the URL is not a supported Google
 * Docs/Slides document link.
 */
export function googleDocsExportUrl(rawUrl: string): string | null {
    let u: URL;
    try {
        u = new URL(rawUrl);
    } catch {
        return null;
    }
    if (u.hostname.toLowerCase() !== 'docs.google.com') return null;
    const m = /\/(document|presentation)\/d\/([\w-]+)/.exec(u.pathname);
    if (!m) return null;
    const kind = m[1];
    const id = m[2];
    return `https://docs.google.com/${kind}/d/${id}/export?format=txt`;
}

/**
 * Pull the first usable caption track baseUrl out of a YouTube watch-page HTML.
 * Prefers manual (non-ASR) tracks, falling back to any track. Returns null if
 * the page exposes no captions.
 */
export function extractYoutubeCaptionUrl(html: string): string | null {
    const m = /"captionTracks":(\[.*?\])/s.exec(html);
    if (!m) return null;
    let tracks: Array<{ baseUrl?: string; kind?: string; languageCode?: string }>;
    try {
        // The JSON contains \u0026 for & — JSON.parse handles the escapes.
        tracks = JSON.parse(m[1]);
    } catch {
        return null;
    }
    if (!Array.isArray(tracks) || tracks.length === 0) return null;
    const manual = tracks.find((t) => t.baseUrl && t.kind !== 'asr');
    const chosen = manual ?? tracks.find((t) => t.baseUrl);
    return chosen?.baseUrl ?? null;
}

/** Decode the small set of XML/HTML entities that appear in caption tracks. */
export function decodeXmlEntities(s: string): string {
    return s
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&#34;|&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
}

/** Turn a YouTube timedtext XML payload into a single plain-text transcript. */
export function parseYoutubeCaptionXml(xml: string): string {
    const parts: string[] = [];
    const re = /<text\b[^>]*>([\s\S]*?)<\/text>/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(xml)) !== null) {
        const line = decodeXmlEntities(match[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
        if (line) parts.push(line);
    }
    return parts.join(' ');
}

/** Strip HTML down to readable text (shared by web + Google Docs fallback). */
export function htmlToText(html: string): string {
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Build a safe .txt filename for a source derived from `label`. */
export function importFilename(label: string, ext = 'txt'): string {
    const stem =
        (label || 'sumber')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 60) || 'sumber';
    return `${stem}_${Date.now()}.${ext}`;
}
