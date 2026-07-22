import { describe, expect, it } from 'vitest';
import { isWeakExtractedText } from './studio-weak-text.util';

describe('isWeakExtractedText', () => {
    it('rejects empty / short text', () => {
        expect(isWeakExtractedText('')).toBe(true);
        expect(isWeakExtractedText('   ')).toBe(true);
        expect(isWeakExtractedText('short')).toBe(true);
    });

    it('rejects exact Document:filename placeholder', () => {
        const longName = `report-${'x'.repeat(40)}.pdf`;
        expect(isWeakExtractedText(`Document: ${longName}`, longName)).toBe(true);
        expect(isWeakExtractedText(`Document:  ${longName}  `, longName)).toBe(true);
        // special regex chars in filename must be escaped
        const dotted = `file.${'y'.repeat(40)}.pdf`;
        expect(isWeakExtractedText(`Document: ${dotted}`, dotted)).toBe(true);
    });

    it('rejects too-large / generic Document stubs', () => {
        expect(
            isWeakExtractedText('Document: big.pdf (too large to extract inline)', 'big.pdf'),
        ).toBe(true);
        expect(isWeakExtractedText('Document: something weird stub text here')).toBe(true);
        // long body still flagged by inline "too large" marker
        const padded = `${'konten '.repeat(40)}(too large to extract inline)`;
        expect(isWeakExtractedText(padded)).toBe(true);
    });

    it('accepts real document content', () => {
        const body =
            'Ini adalah isi dokumen yang cukup panjang untuk lolos ambang ekstraksi teks minimum.';
        expect(isWeakExtractedText(body, 'doc.txt')).toBe(false);
    });

    it('rejects high ratio of non-printable garbage', () => {
        const junk = `${'A'.repeat(20)}${'\u0001'.repeat(30)}`;
        expect(isWeakExtractedText(junk)).toBe(true);
    });
});
