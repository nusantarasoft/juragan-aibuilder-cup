/**
 * Minimal single-page PDF (Helvetica) for Studio E2E — unique facts vs TXT source.
 * Run: node tmp/build-umkm-pdf.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const lines = [
    'CHECKLIST OPERASIONAL UMKM GO GLOBAL 2025',
    '',
    'Dokumen ini melengkapi panduan tumbuh UMKM dengan langkah ekspor dan legalitas.',
    '',
    '1. Target ekspor bertahap',
    'Program UMKM Go Global 2025 menyarankan target ekspor awal 15 persen dari omzet',
    'tahunan dalam 18 bulan. Mulai dari satu negara ASEAN sebelum ke pasar jauh.',
    '',
    '2. Legalitas wajib sebelum ekspor',
    'Urus NIB melalui OSS RBA paling lambat satu hari kerja. Siapkan NPWP badan,',
    'sertifikat SNI jika produk pangan, dan dokumen Certificate of Origin (COO).',
    '',
    '3. Margin marketplace minimum',
    'Jangan listing di marketplace jika margin kotor di bawah 25 persen setelah biaya',
    'iklan, ongkir, dan potongan platform. Hitung ulang harga jual setiap kuartal.',
    '',
    '4. Kasus NusaCraft',
    'UMKM kerajinan NusaCraft naik omzet 40 persen setelah memakai tiga pemasok bahan',
    'baku bergilir dan membatasi rasio stok mati maksimal 8 persen dari inventori.',
    '',
    '5. Indikator ekspor mingguan',
    'Pantau: jumlah inquiry luar negeri, waktu respon chat (target di bawah 2 jam),',
    'dan rasio konversi inquiry ke purchase order. Catat di spreadsheet terpisah.',
    '',
    'Ringkasan PDF',
    'Ekspor aman bila legalitas lengkap, margin marketplace >= 25 persen, stok mati',
    '<= 8 persen, dan target ekspor 15 persen omzet dalam 18 bulan.',
];

function escapePdfText(s) {
    return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildContentStream(textLines) {
    const ops = ['BT', '/F1 11 Tf', '50 760 Td', '14 TL'];
    for (let i = 0; i < textLines.length; i++) {
        const t = escapePdfText(textLines[i] || ' ');
        if (i === 0) {
            ops.push(`(${t}) Tj`);
        } else {
            ops.push('T*', `(${t}) Tj`);
        }
    }
    ops.push('ET');
    return ops.join('\n');
}

function buildPdf(textLines) {
    const stream = buildContentStream(textLines);
    const objects = [];
    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
    objects[3] =
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>';
    objects[4] = `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`;
    objects[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (let i = 1; i <= 5; i++) {
        offsets[i] = Buffer.byteLength(pdf, 'utf8');
        pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xrefStart = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 6\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= 5; i++) {
        pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
    return Buffer.from(pdf, 'utf8');
}

const outPath = path.join(__dirname, 'umkm-go-global-2025.pdf');
fs.writeFileSync(outPath, buildPdf(lines));
console.log('wrote', outPath, 'bytes', fs.statSync(outPath).size);
