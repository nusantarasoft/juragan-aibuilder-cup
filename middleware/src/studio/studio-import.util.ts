/**
 * Pure helpers for importing external URLs as Studio sources.
 *
 * Kept free of network/IO so they can be unit-tested. The service layer wires
 * these into fetch() calls (see StudioService.importUrl).
 */

export type ImportKind = 'youtube' | 'google_doc' | 'google_slides' | 'web';

const YOUTUBE_HOSTS = new Set([
    'youtube.com',
    'm.youtube.com',
    'youtu.be',
    'music.youtube.com',
    'youtube-nocookie.com',
]);

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
    if (YOUTUBE_HOSTS.has(host)) return 'youtube';
    if (host === 'docs.google.com') {
        if (path.includes('/presentation/')) return 'google_slides';
        if (path.includes('/document/')) return 'google_doc';
    }
    return 'web';
}

/** Extract a YouTube video id from watch/short/embed/music URLs. Returns null if none. */
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
    if (YOUTUBE_HOSTS.has(host) && host !== 'youtu.be') {
        const v = u.searchParams.get('v');
        if (v && /^[\w-]{11}$/.test(v)) return v;
        const parts = u.pathname.split('/').filter(Boolean);
        // /embed/<id>, /shorts/<id>, /live/<id>
        if (
            (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') &&
            /^[\w-]{11}$/.test(parts[1] ?? '')
        ) {
            return parts[1];
        }
    }
    return null;
}

/**
 * Convert a Google Docs/Slides URL to its plain-text export endpoint. Works for
 * publicly shared documents (including /u/0/ paths). Returns null when unsupported.
 */
export function googleDocsExportUrl(rawUrl: string): string | null {
    let u: URL;
    try {
        u = new URL(rawUrl);
    } catch {
        return null;
    }
    if (u.hostname.toLowerCase() !== 'docs.google.com') return null;
    const m = /\/(document|presentation)\/(?:u\/\d+\/)?d\/([\w-]+)/.exec(u.pathname);
    if (!m) return null;
    const kind = m[1];
    const id = m[2];
    return `https://docs.google.com/${kind}/d/${id}/export?format=txt`;
}

/**
 * Pull a usable caption track baseUrl out of a YouTube watch-page HTML.
 * Preference: manual id → manual en → any manual → any asr id → any asr → first with baseUrl.
 */
export function extractYoutubeCaptionUrl(html: string): string | null {
    const m = /"captionTracks":(\[.*?\])/s.exec(html);
    if (!m) return null;
    let tracks: Array<{ baseUrl?: string; kind?: string; languageCode?: string }>;
    try {
        tracks = JSON.parse(m[1]);
    } catch {
        return null;
    }
    if (!Array.isArray(tracks) || tracks.length === 0) return null;

    const withUrl = tracks.filter((t) => t.baseUrl);
    if (withUrl.length === 0) return null;

    const lang = (t: { languageCode?: string }) => (t.languageCode || '').toLowerCase();
    const manual = withUrl.filter((t) => t.kind !== 'asr');
    const asr = withUrl.filter((t) => t.kind === 'asr');

    const pick =
        manual.find((t) => lang(t) === 'id') ||
        manual.find((t) => lang(t).startsWith('en')) ||
        manual[0] ||
        asr.find((t) => lang(t) === 'id') ||
        asr.find((t) => lang(t).startsWith('en')) ||
        asr[0]!;

    return pick.baseUrl!;
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

/** Prefer <title> / og:title; fall back to hostname. */
export function extractHtmlTitle(html: string, fallbackHost = 'sumber'): string {
    const og = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html)
        || /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i.exec(html);
    if (og?.[1]?.trim()) return og[1].trim();
    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    if (title?.[1]?.trim()) {
        return title[1].replace(/\s+/g, ' ').trim();
    }
    return fallbackHost;
}

/** Strip HTML down to readable text (shared by web + Google Docs fallback). */
export function htmlToText(html: string): string {
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<(nav|footer|header|aside|form)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * True when the URL host is clearly private / link-local (basic SSRF guard).
 * Does not resolve DNS — blocks literal private IPs and localhost names only.
 */
export function isBlockedImportHost(rawUrl: string): boolean {
    let host: string;
    try {
        host = new URL(rawUrl).hostname.toLowerCase().replace(/^\[|\]$/g, '');
    } catch {
        return true;
    }
    if (host === 'localhost' || host.endsWith('.localhost') || host === '0.0.0.0') return true;
    if (host === '::1' || host === '0:0:0:0:0:0:0:1') return true;
    // IPv4 private / link-local / loopback
    const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(host);
    if (m) {
        const a = Number(m[1]);
        const b = Number(m[2]);
        if (a === 10) return true;
        if (a === 127) return true;
        if (a === 192 && b === 168) return true;
        if (a === 169 && b === 254) return true;
        if (a === 172 && b >= 16 && b <= 31) return true;
        if (a === 0) return true;
    }
    return false;
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
