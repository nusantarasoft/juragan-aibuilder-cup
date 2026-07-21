import { describe, expect, it } from 'vitest';
import {
    aidlcIntentToListenTarget,
    aidlcIntentToUmkmIntent,
    buildUmkmQueryUnderstandingPrompt,
    normalizeUmkmQueryUnderstanding,
    parseUmkmQuJsonFromLlm,
    umkmQueryUnderstandingFromKeywords,
} from './studio-umkm-qu';

describe('studio-umkm-qu', () => {
    it('maps keyword heuristics to AIDLC intents', () => {
        expect(umkmQueryUnderstandingFromKeywords('jual 2 kopi 30000').intent).toBe('catat_transaksi');
        expect(umkmQueryUnderstandingFromKeywords('cek stok gula').intent).toBe('cek_stok');
        expect(umkmQueryUnderstandingFromKeywords('laporan hari ini').intent).toBe('laporan');
        expect(umkmQueryUnderstandingFromKeywords('halo').intent).toBe('lainnya');
    });

    it('normalizes LLM JSON and enforces low-confidence clarification', () => {
        const out = normalizeUmkmQueryUnderstanding(
            {
                intent: 'catat_transaksi',
                normalized_text: 'jual kopi',
                rewritten_query: 'catat penjualan kopi',
                needs_clarification: false,
                clarification_question: null,
                confidence_score: 0.4,
            },
            'jual kopi',
        );
        expect(out.needs_clarification).toBe(true);
        expect(out.clarification_question).toBeTruthy();
    });

    it('maps AIDLC intents to guide listen targets', () => {
        expect(aidlcIntentToListenTarget('catat_transaksi')).toBe('do_record');
        expect(aidlcIntentToListenTarget('cek_stok')).toBe('do_stock');
        expect(aidlcIntentToListenTarget('tanya_umum')).toBe('do_ask');
        expect(aidlcIntentToListenTarget('lainnya')).toBe('help');
    });

    it('NEGATIF: LLM salah label tips omset sebagai laporan → tanya_umum', () => {
        const out = normalizeUmkmQueryUnderstanding(
            {
                intent: 'laporan',
                normalized_text: 'bagaimana cara meningkatkan omset',
                rewritten_query: 'cara meningkatkan omset',
                needs_clarification: false,
                clarification_question: null,
                confidence_score: 0.9,
            },
            'bagaimana cara meningkatkan omset',
        );
        expect(out.intent).toBe('tanya_umum');
        expect(aidlcIntentToListenTarget(out.intent)).toBe('do_ask');
    });

    it('POSITIF: berapa omzet tetap laporan', () => {
        const out = normalizeUmkmQueryUnderstanding(
            {
                intent: 'laporan',
                normalized_text: 'berapa omzet',
                rewritten_query: 'berapa omzet hari ini',
                needs_clarification: false,
                clarification_question: null,
                confidence_score: 0.9,
            },
            'berapa omzet',
        );
        expect(out.intent).toBe('laporan');
    });
});

describe('umkmQueryUnderstandingFromKeywords — clarification', () => {
    it('flags catat_transaksi without a number as needing clarification', () => {
        const out = umkmQueryUnderstandingFromKeywords('jual kopi');
        expect(out.intent).toBe('catat_transaksi');
        expect(out.needs_clarification).toBe(true);
        expect(out.clarification_question).toBeTruthy();
        expect(out.confidence_score).toBe(0.75);
    });
    it('uses lower confidence for lainnya', () => {
        expect(umkmQueryUnderstandingFromKeywords('halo').confidence_score).toBe(0.4);
    });
});

describe('buildUmkmQueryUnderstandingPrompt', () => {
    it('includes conversation history when provided', () => {
        const prompt = buildUmkmQueryUnderstandingPrompt('jual 2 kopi', [
            { role: 'user', content: 'halo' },
            { role: 'assistant', content: 'hai, ada yang bisa dibantu?' },
        ]);
        expect(prompt).toContain('## Riwayat percakapan');
        expect(prompt).toContain('User: halo');
        expect(prompt).toContain('Assistant: hai');
        expect(prompt).toContain('jual 2 kopi');
    });
    it('omits history when there are no lines and escapes special chars', () => {
        const prompt = buildUmkmQueryUnderstandingPrompt('path C:\\x and """quote""" here');
        expect(prompt).not.toContain('## Riwayat percakapan');
        expect(prompt).toContain('C:\\\\x');
        expect(prompt).toContain('\\"\\"\\"');
    });
});

describe('aidlcIntentToUmkmIntent', () => {
    it('maps each AIDLC intent', () => {
        expect(aidlcIntentToUmkmIntent('catat_transaksi')).toBe('record_sale');
        expect(aidlcIntentToUmkmIntent('cek_stok')).toBe('check_stock');
        expect(aidlcIntentToUmkmIntent('laporan')).toBe('sales_report');
        expect(aidlcIntentToUmkmIntent('tanya_umum')).toBe('unknown');
        expect(aidlcIntentToUmkmIntent('lainnya')).toBe('unknown');
    });
});

describe('aidlcIntentToListenTarget — laporan', () => {
    it('maps laporan to do_report', () => {
        expect(aidlcIntentToListenTarget('laporan')).toBe('do_report');
    });
});

describe('parseUmkmQuJsonFromLlm', () => {
    it('parses fenced JSON', () => {
        const obj = parseUmkmQuJsonFromLlm('```json\n{"intent":"laporan"}\n```') as any;
        expect(obj.intent).toBe('laporan');
    });
    it('parses raw JSON with surrounding prose', () => {
        const obj = parseUmkmQuJsonFromLlm('Berikut: {"a":1} selesai') as any;
        expect(obj.a).toBe(1);
    });
    it('returns null when no braces are present', () => {
        expect(parseUmkmQuJsonFromLlm('tidak ada json')).toBeNull();
    });
    it('returns null for malformed JSON', () => {
        expect(parseUmkmQuJsonFromLlm('{ not: valid, }')).toBeNull();
    });
});

describe('normalizeUmkmQueryUnderstanding — branches', () => {
    it('falls back to keyword heuristics when parsing fails', () => {
        const out = normalizeUmkmQueryUnderstanding({ intent: 'not-valid' }, 'cek stok gula');
        expect(out.intent).toBe('cek_stok');
    });

    it('coerces stringy booleans and keeps a provided clarification question', () => {
        const out = normalizeUmkmQueryUnderstanding(
            {
                intent: 'catat_transaksi',
                normalized_text: 'jual kopi',
                rewritten_query: 'catat kopi',
                needs_clarification: 'true',
                clarification_question: 'Berapa harganya?',
                confidence_score: 0.9,
            },
            'jual kopi',
        );
        expect(out.needs_clarification).toBe(true);
        expect(out.clarification_question).toBe('Berapa harganya?');
    });

    it('fills a generic clarification for non-transaction low-confidence intents', () => {
        const out = normalizeUmkmQueryUnderstanding(
            {
                intent: 'cek_stok',
                normalized_text: '',
                rewritten_query: '',
                needs_clarification: 0,
                clarification_question: null,
                confidence_score: 0.3,
            },
            'stok?',
        );
        expect(out.needs_clarification).toBe(true);
        expect(out.clarification_question).toContain('lebih spesifik');
        expect(out.normalized_text).toBe('stok?'); // empty -> original
        expect(out.rewritten_query).toBe('stok?'); // empty -> normalized
    });

    it('clamps confidence into [0,1]', () => {
        const high = normalizeUmkmQueryUnderstanding(
            {
                intent: 'laporan',
                normalized_text: 'omzet',
                rewritten_query: 'omzet',
                needs_clarification: false,
                clarification_question: null,
                confidence_score: 1.8,
            },
            'omzet',
        );
        expect(high.confidence_score).toBe(1);
        const low = normalizeUmkmQueryUnderstanding(
            {
                intent: 'laporan',
                normalized_text: 'omzet',
                rewritten_query: 'omzet',
                needs_clarification: true,
                clarification_question: 'q',
                confidence_score: -0.5,
            },
            'omzet',
        );
        expect(low.confidence_score).toBe(0);
    });
});
