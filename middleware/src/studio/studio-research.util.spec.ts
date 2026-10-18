import { describe, expect, it } from 'vitest';
import { isBlockedImportHost } from './studio-import.util';
import {
    classifyDedupeHits,
    hostMatchesResearchAllowlist,
    isAllowedResearchUrl,
    quotedSnippetInSource,
    validateResearchSources,
} from './studio-research.util';

describe('isAllowedResearchUrl', () => {
    it('allows official go.id domains and jdih', () => {
        expect(isAllowedResearchUrl('https://www.pajak.go.id/artikel/x')).toBe(true);
        expect(isAllowedResearchUrl('https://peraturan.go.id/pp55')).toBe(true);
        expect(isAllowedResearchUrl('https://jdih.jakarta.go.id/peraturan')).toBe(true);
        expect(isAllowedResearchUrl('https://www.bi.go.id/id/qris')).toBe(true);
    });

    it('blocks private hosts and non-government sites', () => {
        expect(isAllowedResearchUrl('http://127.0.0.1/doc')).toBe(false);
        expect(isAllowedResearchUrl('https://example.com/news')).toBe(false);
        expect(isBlockedImportHost('http://192.168.1.1/')).toBe(true);
    });
});

describe('hostMatchesResearchAllowlist', () => {
    it('matches kemenkop subdomains', () => {
        expect(hostMatchesResearchAllowlist('https://www.kemenkopukm.go.id/')).toBe(true);
    });
});

describe('quotedSnippetInSource', () => {
    const body =
        'Wajib Pajak orang pribadi dengan peredaran bruto sampai dengan Rp500 juta dalam satu tahun pajak tidak dikenai PPh final 0,5%.';

    it('accepts verbatim substring', () => {
        expect(
            quotedSnippetInSource(
                'peredaran bruto sampai dengan Rp500 juta dalam satu tahun pajak',
                body,
            ),
        ).toBe(true);
    });

    it('rejects hallucinated quote', () => {
        expect(quotedSnippetInSource('PPh final 99% untuk semua UMKM', body)).toBe(false);
    });
});

describe('validateResearchSources', () => {
    it('flags invalid quotes', () => {
        const map = new Map([['https://pajak.go.id/x', 'teks resmi dari DJP']]);
        const res = validateResearchSources(
            [{ url: 'https://pajak.go.id/x', quoted_snippet: 'teks palsu' }],
            map,
        );
        expect(res.ok).toBe(false);
        expect(res.invalid).toHaveLength(1);
    });
});

describe('classifyDedupeHits', () => {
    it('marks high score as duplicate and mid as conflict', () => {
        const out = classifyDedupeHits(
            [
                {
                    chunkId: 'c1',
                    sourceId: 's1',
                    filename: 'a.txt',
                    content: 'PP 55',
                    score: 0.91,
                },
                {
                    chunkId: 'c2',
                    sourceId: 's2',
                    filename: 'b.txt',
                    content: 'beda',
                    score: 0.8,
                },
            ],
            0.88,
            0.78,
        );
        expect(out.flags).toContain('mirip/duplikat');
        expect(out.flags).toContain('mungkin bertentangan');
        expect(out.hits).toHaveLength(2);
    });
});
