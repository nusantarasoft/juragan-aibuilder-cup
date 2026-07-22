import { describe, expect, it } from 'vitest';
import {
    decodeXmlEntities,
    detectImportKind,
    extractHtmlTitle,
    extractYoutubeCaptionUrl,
    googleDocsExportUrl,
    htmlToText,
    importFilename,
    isBlockedImportHost,
    parseYoutubeCaptionXml,
    youtubeVideoId,
} from './studio-import.util';

describe('detectImportKind', () => {
    it('detects youtube variants', () => {
        expect(detectImportKind('https://www.youtube.com/watch?v=abcdefghijk')).toBe('youtube');
        expect(detectImportKind('https://youtu.be/abcdefghijk')).toBe('youtube');
        expect(detectImportKind('https://m.youtube.com/watch?v=abcdefghijk')).toBe('youtube');
        expect(detectImportKind('https://music.youtube.com/watch?v=abcdefghijk')).toBe('youtube');
        expect(detectImportKind('https://www.youtube-nocookie.com/embed/abcdefghijk')).toBe('youtube');
    });

    it('detects google docs and slides including /u/N/ paths', () => {
        expect(detectImportKind('https://docs.google.com/document/d/XYZ/edit')).toBe('google_doc');
        expect(detectImportKind('https://docs.google.com/presentation/d/XYZ/edit')).toBe('google_slides');
        expect(detectImportKind('https://docs.google.com/document/u/0/d/XYZ/edit')).toBe('google_doc');
    });

    it('falls back to web for other hosts and invalid urls', () => {
        expect(detectImportKind('https://example.com/article')).toBe('web');
        expect(detectImportKind('not a url')).toBe('web');
        expect(detectImportKind('https://docs.google.com/spreadsheets/d/XYZ')).toBe('web');
    });
});

describe('youtubeVideoId', () => {
    it('parses watch, short host, embed, shorts, live, music', () => {
        expect(youtubeVideoId('https://www.youtube.com/watch?v=abcdefghijk')).toBe('abcdefghijk');
        expect(youtubeVideoId('https://youtu.be/abcdefghijk')).toBe('abcdefghijk');
        expect(youtubeVideoId('https://www.youtube.com/embed/abcdefghijk')).toBe('abcdefghijk');
        expect(youtubeVideoId('https://www.youtube.com/shorts/abcdefghijk')).toBe('abcdefghijk');
        expect(youtubeVideoId('https://www.youtube.com/live/abcdefghijk')).toBe('abcdefghijk');
        expect(youtubeVideoId('https://music.youtube.com/watch?v=abcdefghijk')).toBe('abcdefghijk');
    });

    it('returns null for non-youtube or malformed ids', () => {
        expect(youtubeVideoId('https://example.com')).toBeNull();
        expect(youtubeVideoId('https://www.youtube.com/watch?v=short')).toBeNull();
        expect(youtubeVideoId('https://youtu.be/short')).toBeNull();
        expect(youtubeVideoId('nonsense')).toBeNull();
        expect(youtubeVideoId('https://www.youtube.com/feed/xyz')).toBeNull();
        expect(youtubeVideoId('https://www.youtube.com/embed/')).toBeNull();
        expect(youtubeVideoId('https://www.youtube.com/shorts/too-short')).toBeNull();
    });
});

describe('googleDocsExportUrl', () => {
    it('builds txt export urls for docs and slides', () => {
        expect(googleDocsExportUrl('https://docs.google.com/document/d/AbC-1/edit#gid=0')).toBe(
            'https://docs.google.com/document/d/AbC-1/export?format=txt',
        );
        expect(googleDocsExportUrl('https://docs.google.com/presentation/d/AbC-1/edit')).toBe(
            'https://docs.google.com/presentation/d/AbC-1/export?format=txt',
        );
        expect(googleDocsExportUrl('https://docs.google.com/document/u/0/d/AbC-1/edit')).toBe(
            'https://docs.google.com/document/d/AbC-1/export?format=txt',
        );
    });

    it('returns null for non-docs urls', () => {
        expect(googleDocsExportUrl('https://example.com')).toBeNull();
        expect(googleDocsExportUrl('https://docs.google.com/spreadsheets/d/AbC/edit')).toBeNull();
        expect(googleDocsExportUrl('bad url')).toBeNull();
    });
});

describe('extractYoutubeCaptionUrl', () => {
    it('prefers Indonesian then English manual tracks', () => {
        const html = `"captionTracks":[{"baseUrl":"https://asr","kind":"asr","languageCode":"en"},{"baseUrl":"https://en","languageCode":"en"},{"baseUrl":"https://id","languageCode":"id"}]`;
        expect(extractYoutubeCaptionUrl(html)).toBe('https://id');
    });

    it('falls back through English manual, other manual, then ASR langs', () => {
        expect(
            extractYoutubeCaptionUrl(
                `"captionTracks":[{"baseUrl":"https://en","languageCode":"en-US"},{"baseUrl":"https://asr-id","kind":"asr","languageCode":"id"}]`,
            ),
        ).toBe('https://en');
        expect(
            extractYoutubeCaptionUrl(
                `"captionTracks":[{"baseUrl":"https://fr","languageCode":"fr"},{"baseUrl":"https://asr","kind":"asr","languageCode":"en"}]`,
            ),
        ).toBe('https://fr');
        expect(
            extractYoutubeCaptionUrl(
                `"captionTracks":[{"baseUrl":"https://asr-id","kind":"asr","languageCode":"id"},{"baseUrl":"https://asr-en","kind":"asr","languageCode":"en"}]`,
            ),
        ).toBe('https://asr-id');
        expect(
            extractYoutubeCaptionUrl(
                `"captionTracks":[{"baseUrl":"https://asr-en","kind":"asr","languageCode":"en-GB"}]`,
            ),
        ).toBe('https://asr-en');
        expect(
            extractYoutubeCaptionUrl(
                `"captionTracks":[{"baseUrl":"https://asr-fr","kind":"asr","languageCode":"fr"}]`,
            ),
        ).toBe('https://asr-fr');
    });

    it('falls back to any track when only asr exists', () => {
        const html = `"captionTracks":[{"baseUrl":"https://asr","kind":"asr"}]`;
        expect(extractYoutubeCaptionUrl(html)).toBe('https://asr');
    });

    it('returns null when no captions or invalid json', () => {
        expect(extractYoutubeCaptionUrl('no captions here')).toBeNull();
        expect(extractYoutubeCaptionUrl('"captionTracks":[not json]')).toBeNull();
        expect(extractYoutubeCaptionUrl('"captionTracks":[]')).toBeNull();
        expect(extractYoutubeCaptionUrl('"captionTracks":[{"languageCode":"en"}]')).toBeNull();
    });
});

describe('decodeXmlEntities', () => {
    it('decodes common entities and numeric refs', () => {
        expect(decodeXmlEntities('a &amp; b &#39;c&#39; &quot;d&quot; &lt;e&gt; &#65;')).toBe(
            'a & b \'c\' "d" <e> A',
        );
    });
});

describe('parseYoutubeCaptionXml', () => {
    it('joins text nodes into a transcript, stripping tags', () => {
        const xml =
            '<transcript><text start="0">Hello &amp; <b>world</b></text><text start="1">second line</text><text start="2">   </text></transcript>';
        expect(parseYoutubeCaptionXml(xml)).toBe('Hello & world second line');
    });

    it('returns empty string when no text nodes', () => {
        expect(parseYoutubeCaptionXml('<transcript></transcript>')).toBe('');
    });
});

describe('htmlToText', () => {
    it('strips scripts, styles, nav and tags', () => {
        const html =
            '<html><head><style>.a{}</style></head><body><nav>menu</nav><script>x()</script><p>Hi <b>there</b></p><footer>f</footer></body></html>';
        expect(htmlToText(html)).toBe('Hi there');
    });
});

describe('extractHtmlTitle', () => {
    it('prefers og:title then title then fallback', () => {
        expect(
            extractHtmlTitle('<meta property="og:title" content="OG Title"><title>T</title>', 'host'),
        ).toBe('OG Title');
        expect(extractHtmlTitle('<title>  Page   Title  </title>', 'host')).toBe('Page Title');
        expect(extractHtmlTitle('<html></html>', 'example.com')).toBe('example.com');
    });
});

describe('isBlockedImportHost', () => {
    it('blocks localhost and private IPs', () => {
        expect(isBlockedImportHost('http://localhost/a')).toBe(true);
        expect(isBlockedImportHost('http://app.localhost/a')).toBe(true);
        expect(isBlockedImportHost('http://127.0.0.1/a')).toBe(true);
        expect(isBlockedImportHost('http://0.0.0.0/a')).toBe(true);
        expect(isBlockedImportHost('http://0.1.2.3/a')).toBe(true);
        expect(isBlockedImportHost('http://[::1]/a')).toBe(true);
        expect(isBlockedImportHost('http://[0:0:0:0:0:0:0:1]/a')).toBe(true);
        expect(isBlockedImportHost('http://192.168.1.1/a')).toBe(true);
        expect(isBlockedImportHost('http://10.0.0.2/a')).toBe(true);
        expect(isBlockedImportHost('http://172.16.0.1/a')).toBe(true);
        expect(isBlockedImportHost('http://172.31.255.1/a')).toBe(true);
        expect(isBlockedImportHost('http://169.254.1.1/a')).toBe(true);
        expect(isBlockedImportHost('not-a-url')).toBe(true);
    });

    it('allows public hosts', () => {
        expect(isBlockedImportHost('https://example.com/x')).toBe(false);
        expect(isBlockedImportHost('https://docs.google.com/document/d/x')).toBe(false);
        expect(isBlockedImportHost('http://172.32.0.1/a')).toBe(false);
    });
});

describe('importFilename', () => {
    it('slugifies and appends a timestamp + ext', () => {
        const name = importFilename('Hello World!');
        expect(name).toMatch(/^hello_world_\d+\.txt$/);
    });

    it('falls back to "sumber" for empty labels', () => {
        expect(importFilename('')).toMatch(/^sumber_\d+\.txt$/);
        expect(importFilename('   ')).toMatch(/^sumber_\d+\.txt$/);
    });

    it('honours a custom extension', () => {
        expect(importFilename('doc', 'md')).toMatch(/^doc_\d+\.md$/);
    });
});
