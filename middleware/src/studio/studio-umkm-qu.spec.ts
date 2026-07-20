import { describe, expect, it } from 'vitest';
import {
    aidlcIntentToListenTarget,
    normalizeUmkmQueryUnderstanding,
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
});
