/** Prompt builders for Agentic Ask synthesizer (pure strings). */

import type { AgenticAskToolResult } from './studio-umkm-agentic-ask.types';

export function buildAgenticAskSynthesizePrompt(params: {
    notebookName: string;
    question: string;
    toolResults: AgenticAskToolResult[];
    conversationLines?: string[];
    instruction?: string;
}): string {
    const toolBlock = params.toolResults
        .map((t) => {
            const status = t.ok ? 'OK' : 'GAGAL';
            return `### Tool \`${t.name}\` [${status}]\n${t.content || '(kosong)'}`;
        })
        .join('\n\n');

    return [
        'Anda adalah asisten UMKM WhatsApp yang menjawab singkat, jelas, dan faktual dalam Bahasa Indonesia.',
        `Notebook: "${params.notebookName}".`,
        'Jawab HANYA berdasarkan hasil tool di bawah. Jangan mengarang angka stok/omzet/belanja.',
        'Jika data tool kosong atau gagal, katakan jujur dan arahkan ke menu angka (0–6) bila relevan.',
        'Jangan mengeksekusi aksi tulis (jual/tambah menu/belanja) — hanya jelaskan atau arahkan perintah.',
        'Jika pertanyaan berupa tips/saran/strategi (mis. cara menaikkan omzet): jawab dengan saran praktis.',
        'Pakai angka laporan/katalog hanya sebagai konteks singkat — JANGAN menyalin template laporan utuh,',
        'dan jangan mengakhiri dengan "Ketik 6 untuk laporan" kecuali user memang minta laporan.',
        'Gunakan markdown ringan (bold untuk angka penting). Maksimal ~8–12 baris kecuali user minta detail.',
        params.instruction?.trim() ? `Instruksi tambahan: ${params.instruction.trim()}` : '',
        '',
        '## Hasil tool',
        toolBlock || '(tidak ada tool yang dijalankan)',
        '',
        '## Percakapan singkat',
        params.conversationLines?.length
            ? params.conversationLines.slice(-6).join('\n')
            : '(belum ada)',
        '',
        `## Pertanyaan\n${params.question}`,
        '',
        '## Jawaban',
    ]
        .filter((line) => line !== '')
        .join('\n');
}

export function formatSuggestMenuActionContent(): string {
    return [
        'Petunjuk menu asisten (balas angka):',
        '*1* Tanya (pertanyaan umum / data toko)',
        '*2* Menu toko (daftar / tambah / stok)',
        '*3* Belanja',
        '*4* Daftar penjualan',
        '*5* Tambah penjualan — contoh: *jual 2 mie ayam 30000*',
        '*6* Laporan',
        '*0* Bantuan',
        '',
        'Untuk aksi catat data, gunakan menu di atas lalu konfirmasi dengan *ya* / *batal*.',
    ].join('\n');
}
