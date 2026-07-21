import { z } from 'zod';

const jsonBoolean = z.preprocess((val) => {
    if (val === true || val === 'true' || val === 1) return true;
    if (val === false || val === 'false' || val === 0) return false;
    return val;
}, z.boolean());

/** JSON contract stored in guide_flow_context.queryUnderstanding and returned by understandUserQuery. */
export const queryUnderstandingResultSchema = z.object({
    original_query: z.coerce.string(),
    detected_language: z.coerce.string(),
    normalized_text: z.coerce.string(),
    main_intent: z.coerce.string(),
    rewritten_query: z.coerce.string(),
    needs_clarification: jsonBoolean,
    clarification_question: z.coerce.string(),
    confidence: z.coerce.number(),
});

export type QueryUnderstandingResult = z.infer<typeof queryUnderstandingResultSchema>;

export type ConversationLine = { role: 'user' | 'assistant'; content: string };

/** Max clarification questions per listen→rag cycle before forcing retrieval. */
export const MAX_GUIDED_CLARIFICATIONS_PER_CYCLE = 2;

export const CLARIFICATION_CONFIDENCE_THRESHOLD = 0.6;

const DEFAULT_CLARIFICATION = 'Mohon jelaskan lebih spesifik apa yang Anda maksud.';

export const QUERY_UNDERSTANDING_SYSTEM_PROMPT = `Kamu adalah modul pemrosesan query pertama dalam sistem RAG customer service.

Tugasmu adalah menganalisis dan memperbaiki query mentah dari pengguna sebelum diteruskan ke tahap retrieval.

## Langkah yang harus dilakukan secara berurutan:

### 1. Deteksi bahasa
Identifikasi bahasa yang digunakan pengguna (Indonesia, Inggris, campuran, atau bahasa daerah).

### 2. Normalisasi teks
- Perbaiki typo dan ejaan yang salah
- Ubah singkatan umum menjadi kata lengkap (contoh: "gk" → "tidak", "utk" → "untuk", "krn" → "karena")
- Hilangkan karakter tidak relevan (emoji berlebihan, tanda baca ganda)

### 3. Identifikasi maksud utama
Tentukan apa yang sebenarnya ingin diketahui atau diselesaikan pengguna. Fokus pada satu maksud utama jika ada beberapa pertanyaan sekaligus.

### 4. Rewriting query
Gabungkan riwayat percakapan (jika ada) dengan pesan terbaru. Tulis ulang menjadi satu kalimat yang jelas, lengkap, dan spesifik:
- Menggunakan bahasa Indonesia yang baku
- Menggabungkan konteks dari beberapa giliran user (mis. "mau belanja" lalu "product x" lalu "harganya" → "Berapa harga product X untuk belanja?")
- Tidak mengubah maksud asli pengguna

### 5. Deteksi ambiguitas
Hanya set needs_clarification: true jika **setelah memakai riwayat percakapan** masih tidak cukup untuk retrieval.
Jika riwayat sudah menjelaskan produk/topik/intent, set needs_clarification: false dan berikan rewritten_query lengkap.
Berikan satu pertanyaan klarifikasi yang singkat dan terarah (bukan pertanyaan generik berulang).

## Format output (JSON):
{
  "original_query": "<query asli dari pengguna>",
  "detected_language": "<bahasa yang terdeteksi>",
  "normalized_text": "<teks setelah normalisasi>",
  "main_intent": "<maksud utama dalam satu kalimat>",
  "rewritten_query": "<query yang sudah ditulis ulang>",
  "needs_clarification": <true/false>,
  "clarification_question": "<pertanyaan klarifikasi jika needs_clarification true, kosong jika false>",
  "confidence": <0.0 - 1.0>
}

## Aturan penting:
- Jangan menjawab pertanyaan pengguna — tugasmu hanya memproses dan merestrukturisasi query
- Jangan menambahkan asumsi yang tidak ada di query asli
- Jika confidence di bawah ${CLARIFICATION_CONFIDENCE_THRESHOLD}, biasanya set needs_clarification: true — kecuali riwayat percakapan sudah cukup menjelaskan maksud
- Output harus selalu berupa JSON valid, tidak ada teks di luar JSON`;

function escapeForPrompt(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"');
}

export function buildQueryUnderstandingPrompt(
    userInput: string,
    conversationLines: ConversationLine[] = [],
): string {
    const escaped = escapeForPrompt(userInput);
    const history =
        conversationLines.length > 0
            ? `## Riwayat percakapan terbaru\n${conversationLines
                  .map((l) => `${l.role === 'user' ? 'User' : 'Assistant'}: ${l.content}`)
                  .join('\n')}\n\n`
            : '';
    const userBlock = `${history}## Pesan terbaru dari pengguna
"""
${escaped}
"""`;
    return `${QUERY_UNDERSTANDING_SYSTEM_PROMPT}

---

${userBlock}`;
}

/** Whether guided flow should ask another clarification (respects per-cycle cap). */
export function shouldAskClarification(
    qu: QueryUnderstandingResult,
    clarificationCount: number,
): boolean {
    if (clarificationCount >= MAX_GUIDED_CLARIFICATIONS_PER_CYCLE) return false;
    return qu.needs_clarification;
}

/** Build retrieval text when proceeding after multi-turn user input. */
export function buildRetrievalQueryFromTurns(
    latestUserMessage: string,
    userTurns: string[],
    qu: QueryUnderstandingResult,
    options?: { preferMergedTurns?: boolean },
): string {
    const parts = [...userTurns.filter((t) => t?.trim()), latestUserMessage.trim()].filter(Boolean);
    const unique = [...new Set(parts)];
    const merged = unique.join(' — ');
    if (options?.preferMergedTurns && merged.length > 0) {
        return merged;
    }
    const rewritten = qu.rewritten_query?.trim();
    if (rewritten && rewritten.length > 0) return rewritten;
    return merged || latestUserMessage;
}

/** After clarification cap, force RAG with best-effort merged query. */
export function forceProceedAfterClarificationCap(
    qu: QueryUnderstandingResult,
    latestUserMessage: string,
    userTurns: string[],
): QueryUnderstandingResult {
    return {
        ...qu,
        needs_clarification: false,
        clarification_question: '',
        rewritten_query: buildRetrievalQueryFromTurns(latestUserMessage, userTurns, qu, {
            preferMergedTurns: true,
        }),
        confidence: Math.max(qu.confidence, CLARIFICATION_CONFIDENCE_THRESHOLD),
    };
}

function clampConfidence(n: unknown): number {
    /* v8 ignore next -- confidence is always a finite number after schema validation (Zod rejects NaN); the `: 0` guard is defensive */
    const x = typeof n === 'number' && !Number.isNaN(n) ? n : 0;
    return Math.min(1, Math.max(0, x));
}

/**
 * Validates model output, enforces confidence < 0.6 ⇒ needs_clarification, fills defaults.
 */
export function normalizeQueryUnderstanding(parsed: unknown, originalUserText: string): QueryUnderstandingResult {
    const base: QueryUnderstandingResult = {
        original_query: originalUserText,
        detected_language: 'unknown',
        normalized_text: originalUserText,
        main_intent: '',
        rewritten_query: originalUserText,
        needs_clarification: false,
        clarification_question: '',
        confidence: 0.35,
    };

    const r = queryUnderstandingResultSchema.safeParse(parsed);
    if (!r.success) {
        return base;
    }

    let {
        original_query,
        detected_language,
        normalized_text,
        main_intent,
        rewritten_query,
        needs_clarification,
        clarification_question,
        confidence,
    } = r.data;

    original_query = original_query.trim() || originalUserText;
    detected_language = detected_language.trim() || 'unknown';
    normalized_text = normalized_text.trim() || originalUserText;
    main_intent = main_intent.trim();
    rewritten_query = rewritten_query.trim() || normalized_text || originalUserText;
    clarification_question = clarification_question.trim();
    confidence = clampConfidence(confidence);

    if (confidence < CLARIFICATION_CONFIDENCE_THRESHOLD) {
        needs_clarification = true;
    }
    if (needs_clarification && !clarification_question) {
        clarification_question = DEFAULT_CLARIFICATION;
    }

    return {
        original_query,
        detected_language,
        normalized_text,
        main_intent,
        rewritten_query,
        needs_clarification,
        clarification_question,
        confidence,
    };
}
