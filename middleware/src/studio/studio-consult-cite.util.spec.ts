/**
 * Page cite helpers for WA kurikulum consult (chunk markers → hlm).
 */
import { describe, expect, it } from 'vitest';
import {
    ensureConsultBookCite,
    extractPdfPagesFromChunk,
    formatHlmCite,
    primaryPdfPageFromChunk,
} from './studio-consult-cite.util';

describe('extractPdfPagesFromChunk', () => {
    it('parses -- N of M -- markers', () => {
        expect(extractPdfPagesFromChunk('foo -- 12 of 200 -- bar')).toEqual([12]);
        expect(
            extractPdfPagesFromChunk('-- 3 of 10 --\ntext\n-- 5 of 10 --'),
        ).toEqual([3, 5]);
    });

    it('parses halaman / hlm mentions', () => {
        expect(extractPdfPagesFromChunk('lihat hlm. 42')).toEqual([42]);
        expect(extractPdfPagesFromChunk('Halaman 7 lanjut')).toEqual([7]);
    });
});

describe('primaryPdfPageFromChunk / formatHlmCite', () => {
    it('picks first page', () => {
        expect(primaryPdfPageFromChunk('-- 9 of 100 --')).toBe(9);
        expect(primaryPdfPageFromChunk('no page')).toBeNull();
    });

    it('formats ranges', () => {
        expect(formatHlmCite([12])).toBe('hlm. 12');
        expect(formatHlmCite([12, 14])).toBe('hlm. 12–14');
        expect(formatHlmCite([3, 5, 9])).toBe('hlm. 3–9');
        expect(formatHlmCite([])).toBe('');
    });
});

describe('ensureConsultBookCite', () => {
    it('appends cite with hlm when missing', () => {
        expect(ensureConsultBookCite('Pisahkan modal usaha.', [12])).toBe(
            'Pisahkan modal usaha.\n\n(dari buku Manajemen UKM, hlm. 12)',
        );
    });

    it('upgrades bare book cite with hlm', () => {
        expect(
            ensureConsultBookCite('Tips. (dari buku Manajemen UKM)', [8]),
        ).toBe('Tips. (dari buku Manajemen UKM, hlm. 8)');
    });

    it('leaves existing hlm alone', () => {
        const t = 'Tips (dari buku Manajemen UKM, hlm. 3)';
        expect(ensureConsultBookCite(t, [99])).toBe(t);
    });

    it('no pages → bare book cite; strips invented hlm', () => {
        expect(ensureConsultBookCite('Tips saja.', [])).toBe(
            'Tips saja.\n\n(dari buku Manajemen UKM)',
        );
        expect(
            ensureConsultBookCite(
                'Tips. (dari buku Manajemen UKM, hlm. 214)',
                [],
            ),
        ).toBe('Tips. (dari buku Manajemen UKM)');
    });
});
