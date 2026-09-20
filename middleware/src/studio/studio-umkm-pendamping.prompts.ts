/**
 * Pendamping synthesizer prompts — tools + playbook only; no invented numbers.
 */

export function buildPendampingSynthesizePrompt(input: {
    toolPayloads: string;
    curriculum: string;
    userAlias: string;
    notebookContext?: string;
}): string {
    const curriculumBlock = input.curriculum.trim()
        ? input.curriculum.trim().slice(0, 3000)
        : '(Playbook kosong — pakai hanya angka dari tools; jangan mengarang benchmark.)';
    const notebookBlock = (input.notebookContext || '').trim()
        ? input.notebookContext!.trim().slice(0, 2000)
        : '(Tidak ada cuplikan notebook terindeks.)';

    return [
        'Kamu adalah pendamping bisnis warung (bukan kasir).',
        'Tugas: tulis maksimal 3 tips singkat dalam bahasa Indonesia untuk pemilik toko WhatsApp.',
        '',
        'Aturan keras:',
        '- Hanya pakai angka/fakta dari BLOK_TOOLS, cuplikan BLOK_NOTEBOOK, dan materi dari BLOK_PLAYBOOK.',
        '- Jangan mengarang omzet, stok, atau benchmark internet.',
        '- Jika data kosong: ajak catat jual/belanja dulu; jangan fake angka.',
        '- Setiap tip: judul singkat + kenapa (sebut field tool jika ada) + aksi (opsional ketik: …).',
        '- Aksi ketik: hanya perintah kasir: jual, belanja, cek stok, laporan, daftar, tambah stok, omzet.',
        '- Jangan minta konfirmasi ya/batal. Jangan tulis perintah destruktif.',
        '- Total balasan maksimal ~800 karakter. Tanpa markdown berlebihan.',
        '',
        '<<<USER_ALIAS>>>',
        input.userAlias,
        '<<<END_USER_ALIAS>>>',
        '',
        '<<<BLOK_TOOLS>>>',
        input.toolPayloads,
        '<<<END_BLOK_TOOLS>>>',
        '',
        '<<<BLOK_NOTEBOOK>>>',
        notebookBlock,
        '<<<END_BLOK_NOTEBOOK>>>',
        '',
        '<<<BLOK_PLAYBOOK>>>',
        curriculumBlock,
        '<<<END_BLOK_PLAYBOOK>>>',
        '',
        'Format output contoh:',
        'Ringkasan: …',
        '',
        '1. Judul',
        'Kenapa: …',
        'Aksi: ketik: belanja 1 dus indomie',
    ].join('\n');
}

export function formatPendampingNumbersOnlyFallback(parts: {
    report?: string;
    products?: string;
    stock?: string;
    curriculumMiss?: boolean;
}): string {
    const lines = ['*Pendamping* — ringkasan angka (tanpa saran AI):', ''];
    if (parts.report?.trim()) {
        lines.push(parts.report.trim().slice(0, 400), '');
    }
    if (parts.stock?.trim()) {
        lines.push('*Stok tipis:*', parts.stock.trim().slice(0, 300), '');
    }
    if (parts.products?.trim() && /belum|kosong|0 produk|tidak ada/i.test(parts.products)) {
        lines.push('Etalase masih kosong. Ketik *jual* atau *belanja* untuk mulai catat.', '');
    }
    if (!parts.report?.trim() && !parts.stock?.trim()) {
        lines.push(
            'Belum ada data toko yang bisa dibaca.',
            'Ketik *jual 2 indomie* atau *belanja 1 dus indomie* dulu, lalu ketik *pendamping* lagi.',
            '',
        );
    }
    if (parts.curriculumMiss) {
        lines.push('(Playbook pendamping belum tersedia di server.)');
    }
    lines.push('Ketik *pendamping* lagi nanti, atau *0* untuk menu.');
    return lines.join('\n').slice(0, 800);
}

export function formatPendampingEmptyShop(): string {
    return [
        '*Pendamping*',
        '',
        'Belum ada data penjualan/belanja yang cukup untuk saran.',
        'Mulai catat: ketik *jual 2 indomie* atau *belanja 1 dus indomie*.',
        'Setelah ada angka di buku, ketik *pendamping* lagi.',
    ].join('\n');
}

/** WA kasir_consult — miss retrieve (no free LLM). */
export const CONSULT_MISS_COPY =
    'Belum ketemu di buku kurikulum. Coba tanya lebih spesifik, atau ketik cek stok / laporan untuk data toko.';

/** WA kasir_consult — synthesize/timeout/error. */
export const CONSULT_BUSY_COPY =
    'Layanan konsultasi lagi sibuk. Coba lagi sebentar.';

/** WA kasir_consult — feature flag off (Hermes + Nest). */
export const CONSULT_OFF_COPY =
    'Konsultasi kurikulum belum aktif. Untuk data toko ketik cek stok / laporan.';

/**
 * L8 defense: question is clearly live store facts — do not RAG buku / ledger tables.
 * Owner should use kasir tools (cek stok / jual / laporan).
 */
export const CONSULT_LEDGER_REDIRECT_COPY =
    'Untuk stok, jual-beli, atau laporan toko, ketik langsung *cek stok* / *jual* / *laporan* — itu data kasir, bukan dari buku kurikulum.';

/**
 * Heuristic: query looks like live kasir/ledger ops (stok, jual, omzet, …).
 * Used to skip notebook retrieve — never embed or search ledger tables.
 */
export function looksLikeKasirLedgerQuestion(question: string): boolean {
    const q = (question || '').trim().toLowerCase();
    if (!q) return false;
    // Strip common consult prefixes so "tanya cek stok indomie" still matches.
    const bare = q
        .replace(/^(tanya|konsultasi|pendamping)\s+/i, '')
        .trim();
    const patterns: RegExp[] = [
        /\bcek\s*stok\b/,
        /\bstok\s+(mau\s+)?habis\b/,
        /\bstok\s+menipis\b/,
        /\bsisa\s+(stok|barang)\b/,
        /\bberapa\s+stok\b/,
        /\bstok\s+berapa\b/,
        /\b(omzet|laporan|paling\s+laris|tutup\s+toko)\b/,
        /\b(jual|ada\s+yang\s+beli)\s+\d/,
        /^\s*(jual|belanja|restock|satu\s+lagi)\b/,
        /\b(on_hand|sku)\b/,
    ];
    return patterns.some((re) => re.test(bare) || re.test(q));
}

/**
 * Chunk-only synthesizer for WA kurikulum consult.
 * Never include store report/stock — L8: buku ≠ ledger.
 */
export function buildConsultFromNotebookPrompt(input: {
    question: string;
    chunkContext: string;
}): string {
    const chunks = input.chunkContext.trim().slice(0, 3500) || '(Tidak ada cuplikan.)';
    const question = input.question.trim().slice(0, 500);

    return [
        'Kamu menjawab pertanyaan pemilik warung WhatsApp hanya dari cuplikan buku kurikulum di bawah.',
        'Bahasa Indonesia, singkat (maks ~800 karakter).',
        '',
        'Aturan keras:',
        '- Jawab HANYA dari <<<BLOK_BUKU>>>. Jangan mengarang.',
        '- Jangan sebut atau mengarang omzet, stok, harga toko, atau angka ledger kasir.',
        '- Jangan minta ketik: jual/belanja/hapus. Ini bukan mode kasir.',
        '- Jika cuplikan tidak cukup: bilang belum ketemu di buku, sarankan tanya lebih spesifik.',
        '- Sitasi ringan: boleh akhiri dengan "(dari buku Manajemen UKM)".',
        '- Tanpa markdown berlebihan.',
        '',
        '<<<USER_QUESTION>>>',
        question,
        '<<<END_USER_QUESTION>>>',
        '',
        '<<<BLOK_BUKU>>>',
        chunks,
        '<<<END_BLOK_BUKU>>>',
    ].join('\n');
}
