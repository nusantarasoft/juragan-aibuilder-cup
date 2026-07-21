import { describe, expect, it } from 'vitest';
import {
    decodeXmlEntities,
    detectImportKind,
    extractYoutubeCaptionUrl,
    googleDocsExportUrl,
    htmlToText,
    importFilename,
    parseYoutubeCaptionXml,
    youtubeVideoId,
} from './studio-import.util';

describe('detectImportKind', () => {
    it('detects youtube variants', () => {
        expect(detectImportKind('https://www.youtube.com/watch?v=abcdefghijk')).toBe('youtube');
        expect(detectImportKind('https://youtu.be/abcdefghijk')).toBe('youtube');
        expect(detectImportKind('https://m.youtube.com/watch?v=abcdefghijk')).toBe('youtube');
    });

    it('detects google docs and slides', () => {
        expect(detectImportKind('https://docs.google.com/document/d/XYZ/edit')).toBe('google_doc');
        expect(detectImportKind('https://docs.google.com/presentation/d/XYZ/edit')).toBe('google_slides');
    });

    it('falls back to web for other hosts and invalid urls', () => {
        expect(detectImportKind('https://example.com/article')).toBe('web');
        expect(detectImportKind('not a url')).toBe('web');
        expect(detectImportKind('https://docs.google.com/spreadsheets/d/XYZ')).toBe('web');
    });
});

describe('youtubeVideoId', () => {
    it('parses watch, short host, embed and shorts', () => {
        expect(youtubeVideoId('https://www.youtube.com/watch?v=abcdefghijk')).toBe('abcdefghijk');
        expect(youtubeVideoId('https://youtu.be/abcdefghijk')).toBe('abcdefghijk');
        expect(youtubeVideoId('https://www.youtube.com/embed/abcdefghijk')).toBe('abcdefghijk');
        expect(youtubeVideoId('https://www.youtube.com/shorts/abcdefghijk')).toBe('abcdefghijk');
    });

    it('returns null for non-youtube or malformed ids', () => {
        expect(youtubeVideoId('https://example.com')).toBeNull();
        expect(youtubeVideoId('https://www.youtube.com/watch?v=short')).toBeNull();
        expect(youtubeVideoId('https://youtu.be/short')).toBeNull();
        expect(youtubeVideoId('nonsense')).toBeNull();
        expect(youtubeVideoId('https://www.youtube.com/feed/xyz')).toBeNull();
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
    });

    it('returns null for non-docs urls', () => {
        expect(googleDocsExportUrl('https://example.com')).toBeNull();
        expect(googleDocsExportUrl('https://docs.google.com/spreadsheets/d/AbC/edit')).toBeNull();
        expect(googleDocsExportUrl('bad url')).toBeNull();
    });
});

describe('extractYoutubeCaptionUrl', () => {
    it('prefers a manual (non-asr) track', () => {
        const html = `foo "captionTracks":[{"baseUrl":"https://asr","kind":"asr"},{"baseUrl":"https://manual","languageCode":"en"}] bar`;
        expect(extractYoutubeCaptionUrl(html)).toBe('https://manual');
    });

    it('falls back to any track when only asr exists', () => {
        const html = `"captionTracks":[{"baseUrl":"https://asr","kind":"asr"}]`;
        expect(extractYoutubeCaptionUrl(html)).toBe('https://asr');
    });

    it('returns null when no captions or invalid json', () => {
        expect(extractYoutubeCaptionUrl('no captions here')).toBeNull();
        expect(extractYoutubeCaptionUrl('"captionTracks":[not json]')).toBeNull();
        expect(extractYoutubeCaptionUrl('"captionTracks":[]')).toBeNull();
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
    it('strips scripts, styles and tags', () => {
        const html = '<html><head><style>.a{}</style></head><body><script>x()</script><p>Hi <b>there</b></p></body></html>';
        expect(htmlToText(html)).toBe('Hi there');
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
