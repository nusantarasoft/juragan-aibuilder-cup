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
