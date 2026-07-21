import { describe, expect, it } from 'vitest';
import { chunkForTts, cleanForTts, stripSpeakerLabels, ttsLanguageCode } from './studio-tts.util';

describe('stripSpeakerLabels', () => {
    it('removes short speaker labels', () => {
        const input = ['Andi: Halo semuanya.', 'Host B: Selamat datang.', '**Budi:** Terima kasih.'].join('\n');
        expect(stripSpeakerLabels(input)).toBe(['Halo semuanya.', 'Selamat datang.', 'Terima kasih.'].join('\n'));
    });

    it('keeps normal sentences that happen to contain a colon', () => {
        const line = 'Kesimpulan penting dari analisis ini adalah: penjualan naik.';
        expect(stripSpeakerLabels(line)).toBe(line);
    });
});

describe('cleanForTts', () => {
    it('strips markdown emphasis, links and extra whitespace', () => {
        const input = '# Judul\n\n**Halo**  _dunia_ lihat [tautan](http://x)   selesai';
        expect(cleanForTts(input)).toBe('Judul\nHalo dunia lihat tautan selesai');
    });
});

describe('chunkForTts', () => {
    it('returns empty array for empty input', () => {
        expect(chunkForTts('')).toEqual([]);
        expect(chunkForTts('   ')).toEqual([]);
    });

    it('returns a single chunk when under the limit', () => {
        expect(chunkForTts('Halo dunia.', 100)).toEqual(['Halo dunia.']);
    });

    it('splits at sentence boundaries', () => {
        const text = 'Satu kalimat pertama. Kalimat kedua di sini. Kalimat ketiga terakhir.';
        const chunks = chunkForTts(text, 30);
        expect(chunks.length).toBeGreaterThan(1);
        for (const c of chunks) expect(c.length).toBeLessThanOrEqual(30);
        expect(chunks.join(' ').replace(/\s+/g, ' ')).toContain('Kalimat ketiga terakhir.');
    });

    it('hard-splits sentences longer than the limit', () => {
        const long = 'a'.repeat(50);
        const chunks = chunkForTts(long, 20);
        expect(chunks).toHaveLength(3);
        expect(chunks[0]).toHaveLength(20);
    });
});

describe('ttsLanguageCode', () => {
    it('maps known languages and defaults to id-ID', () => {
        expect(ttsLanguageCode('en')).toBe('en-US');
        expect(ttsLanguageCode('jv')).toBe('jv-ID');
        expect(ttsLanguageCode('ms')).toBe('ms-MY');
        expect(ttsLanguageCode('ar')).toBe('ar-XA');
        expect(ttsLanguageCode('zh')).toBe('cmn-CN');
        expect(ttsLanguageCode('id')).toBe('id-ID');
        expect(ttsLanguageCode()).toBe('id-ID');
        expect(ttsLanguageCode('xx')).toBe('id-ID');
    });
});
