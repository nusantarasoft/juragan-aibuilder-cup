/** UMKM WhatsApp — feedback / rating parsing (AIDLC Operate & Iterate). */

export type UmkmFeedbackRating = {
    score: number; // 1–5
    label: 'buruk' | 'kurang' | 'cukup' | 'puas' | 'sangat_puas';
    raw: string;
};

const SCORE_WORDS: { re: RegExp; score: number; label: UmkmFeedbackRating['label'] }[] = [
    { re: /^(sangat\s+puas|keren|mantap|bintang\s*5|⭐{5})$/i, score: 5, label: 'sangat_puas' },
    { re: /^(puas|bagus|baik|👍|bintang\s*4|⭐{4})$/i, score: 4, label: 'puas' },
    { re: /^(cukup|biasa|lumayan|bintang\s*3|⭐{3})$/i, score: 3, label: 'cukup' },
    { re: /^(kurang|jelek|buruk|kecewa|bintang\s*2|⭐{2})$/i, score: 2, label: 'kurang' },
    { re: /^(sangat\s+buruk|parah|bintang\s*1|⭐)$/i, score: 1, label: 'buruk' },
];

/** Parse explicit feedback (1–5 or keyword). Returns null if not feedback. */
export function detectUmkmFeedback(text: string): UmkmFeedbackRating | null {
    const t = text.trim().replace(/^[.!]+|[.!]+$/g, '').trim();
    if (!t) return null;

    const bare = t.match(/^(?:nilai|rating|bintang)?\s*([1-5])\s*(?:\/\s*5)?$/i);
    if (bare) {
        const score = parseInt(bare[1], 10);
        return { score, label: scoreToLabel(score), raw: t };
    }

    for (const row of SCORE_WORDS) {
        if (row.re.test(t)) return { score: row.score, label: row.label, raw: t };
    }
    return null;
}

function scoreToLabel(score: number): UmkmFeedbackRating['label'] {
    if (score >= 5) return 'sangat_puas';
    if (score === 4) return 'puas';
    if (score === 3) return 'cukup';
    if (score === 2) return 'kurang';
    return 'buruk';
}

export function formatFeedbackThanks(rating: UmkmFeedbackRating): string {
    return [
        `🙏 Terima kasih atas penilaiannya (*${rating.score}/5*).`,
        'Masukan ini membantu kami memperbaiki asisten UMKM.',
        '',
        'Ketik *bantuan* untuk menu, atau lanjut catat penjualan.',
    ].join('\n');
}

export function formatFeedbackInvite(): string {
    return 'Beri nilai layanan? Ketik *1–5*, *puas*, atau *kurang*.';
}
