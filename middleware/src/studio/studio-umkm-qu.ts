/** AIDLC Query Understanding for UMKM WhatsApp path. */

import { z } from 'zod';
import type { ConversationLine } from './query-understanding';
import { CLARIFICATION_CONFIDENCE_THRESHOLD } from './query-understanding';
import { detectUmkmIntent, toAidlcIntent, type AidlcUmkmIntent, type UmkmIntent } from './studio-umkm.util';

const jsonBoolean = z.preprocess((val) => {
    if (val === true || val === 'true' || val === 1) return true;
    if (val === false || val === 'false' || val === 0) return false;
    return val;
}, z.boolean());

export const AIDLC_INTENT_VALUES = [
    'catat_transaksi',
    'cek_stok',
    'laporan',
    'tanya_umum',
    'lainnya',
] as const;

export const umkmQueryUnderstandingSchema = z.object({
    intent: z.enum(AIDLC_INTENT_VALUES),
    normalized_text: z.coerce.string(),
    rewritten_query: z.coerce.string(),
    needs_clarification: jsonBoolean,
    clarification_question: z.coerce.string().nullable().optional(),
    confidence_score: z.coerce.number(),
});

export type UmkmQueryUnderstanding = z.infer<typeof umkmQueryUnderstandingSchema>;

export const UMKM_QUERY_UNDERSTANDING_PROMPT = `Kamu adalah modul Query Understanding untuk asisten UMKM WhatsApp (Bahasa Indonesia, termasuk gaul/typo).

Tugas: klasifikasi intent dan normalisasi pesan. JANGAN menjawab pertanyaan pengguna.

Intent yang diizinkan (pilih SATU):
- catat_transaksi — user mencatat penjualan/pembelian/order (contoh: "jual 3 kopi 15rb")
- cek_stok — user bertanya sisa/stok barang
- laporan — user minta rekap/omzet/ringkasan penjualan
- tanya_umum — pertanyaan umum soal toko/produk/cara pakai/data (bukan aksi catat/stok/laporan langsung)
- lainnya — sapaan, tidak jelas, di luar cakupan

Aturan:
- rewritten_query: versi jelas dari pesan (untuk handler berikutnya), bukan jawaban.
- needs_clarification: true jika catat_transaksi tapi qty/nama/harga masih ambigu setelah mempertimbangkan riwayat.
- Jika confidence_score < ${CLARIFICATION_CONFIDENCE_THRESHOLD}, set needs_clarification true (kecuali riwayat sudah cukup).
- Output HANYA JSON valid:
{
  "intent": "catat_transaksi|cek_stok|laporan|tanya_umum|lainnya",
  "normalized_text": "...",
  "rewritten_query": "...",
  "needs_clarification": false,
  "clarification_question": null,
  "confidence_score": 0.0
}`;

function escapeForPrompt(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"');
}

export function buildUmkmQueryUnderstandingPrompt(
    userInput: string,
    conversationLines: ConversationLine[] = [],
): string {
    const history =
        conversationLines.length > 0
            ? `## Riwayat percakapan\n${conversationLines
                  .map((l) => `${l.role === 'user' ? 'User' : 'Assistant'}: ${l.content}`)
                  .join('\n')}\n\n`
            : '';
    return `${UMKM_QUERY_UNDERSTANDING_PROMPT}

---

${history}## Pesan terbaru
"""
${escapeForPrompt(userInput)}
"""`;
}

function clampConfidence(n: unknown): number {
    const x = typeof n === 'number' && !Number.isNaN(n) ? n : 0;
    return Math.min(1, Math.max(0, x));
}

/** Heuristic fallback when LLM unavailable. */
export function umkmQueryUnderstandingFromKeywords(text: string): UmkmQueryUnderstanding {
    const intent = toAidlcIntent(detectUmkmIntent(text));
    const needs = intent === 'catat_transaksi' && !/\d/.test(text);
    return {
        intent,
        normalized_text: text.trim(),
        rewritten_query: text.trim(),
        needs_clarification: needs,
        clarification_question: needs
            ? 'Mohon sebutkan jumlah, nama barang, dan harga/total. Contoh: jual 3 kopi 45000'
            : null,
        confidence_score: intent === 'lainnya' ? 0.4 : 0.75,
    };
}

export function normalizeUmkmQueryUnderstanding(
    parsed: unknown,
    originalUserText: string,
): UmkmQueryUnderstanding {
    const fallback = umkmQueryUnderstandingFromKeywords(originalUserText);
    const r = umkmQueryUnderstandingSchema.safeParse(parsed);
    if (!r.success) return fallback;

    let {
        intent,
        normalized_text,
        rewritten_query,
        needs_clarification,
        clarification_question,
        confidence_score,
    } = r.data;

    normalized_text = String(normalized_text || '').trim() || originalUserText;
    rewritten_query = String(rewritten_query || '').trim() || normalized_text;
    confidence_score = clampConfidence(confidence_score);
    let clarifyQ =
        clarification_question == null || clarification_question === undefined
            ? ''
            : String(clarification_question).trim();

    if (confidence_score < CLARIFICATION_CONFIDENCE_THRESHOLD) {
        needs_clarification = true;
    }
    if (needs_clarification && !clarifyQ) {
        clarifyQ =
            intent === 'catat_transaksi'
                ? 'Mohon sebutkan jumlah, nama barang, dan harga/total. Contoh: jual 3 kopi 45000'
                : 'Mohon jelaskan lebih spesifik apa yang Anda maksud.';
    }

    return {
        intent,
        normalized_text,
        rewritten_query,
        needs_clarification,
        clarification_question: needs_clarification ? clarifyQ : null,
        confidence_score,
    };
}

export function aidlcIntentToUmkmIntent(intent: AidlcUmkmIntent): UmkmIntent {
    switch (intent) {
        case 'catat_transaksi':
            return 'record_sale';
        case 'cek_stok':
            return 'check_stock';
        case 'laporan':
            return 'sales_report';
        case 'tanya_umum':
            return 'unknown';
        default:
            return 'unknown';
    }
}

/** Map AIDLC intent → guide flow node id (UMKM template). */
export function aidlcIntentToListenTarget(intent: AidlcUmkmIntent): string {
    switch (intent) {
        case 'catat_transaksi':
            return 'do_record';
        case 'cek_stok':
            return 'do_stock';
        case 'laporan':
            return 'do_report';
        case 'tanya_umum':
            return 'do_ask';
        default:
            return 'help';
    }
}

export function parseUmkmQuJsonFromLlm(raw: string): unknown | null {
    const trimmed = raw.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonText = fenced ? fenced[1].trim() : trimmed;
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
        return JSON.parse(jsonText.slice(start, end + 1));
    } catch {
        return null;
    }
}
