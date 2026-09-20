"use client";

import { motion, useReducedMotion } from "motion/react";

const WA_URL =
  process.env.NEXT_PUBLIC_KASIR_WA_URL ||
  "https://wa.me/62811924689?text=" + encodeURIComponent("DAFTAR");

/** Nomor bisnis yang disebar untuk DAFTAR (tampil di copy). */
const WA_DISPLAY = "+62 811-924-689";

/** Copy shaped like live kasir-tools / consult replies (not marketing placeholders). */
const CHATS = [
  {
    label: "Kasir — cek stok (angka toko)",
    lines: [
      { who: "you" as const, text: "cek stok indomie" },
      {
        who: "bot" as const,
        text: "📦 *Cek Stok*\n\n• Indomie Goreng — sisa *12*\n• Indomie Ayam Bawang — sisa *4*",
      },
      { who: "you" as const, text: "stok mau habis" },
      {
        who: "bot" as const,
        text: "⚠️ *Stok menipis* (sisa ≤ 10)\n\n1. *Indomie Ayam Bawang* — sisa *4*\n2. *Teh Botol* — sisa *7*\n\nPaling kritis: *Indomie Ayam Bawang*.",
      },
    ],
  },
  {
    label: "Kasir — catat jual (angka toko)",
    lines: [
      { who: "you" as const, text: "ada yang beli 2 indomie goreng" },
      {
        who: "bot" as const,
        text: "📋 *Konfirmasi penjualan*\n\n• 2 × Indomie Goreng @ Rp 3.500\n\nTotal: *Rp 7.000*\nBayar: tunai\n\nPilih *Ya, simpan* atau *Batal* di tombol di atas (atau ketik *ya* / *batal*).",
        poll: true,
      },
      { who: "you" as const, text: "Ya, simpan" },
      {
        who: "bot" as const,
        text: "✅ *Penjualan tercatat*\nNo. SO-20260920-014\nTotal: Rp 7.000\nMau ulang item yang sama? Ketik *satu lagi*.",
      },
    ],
  },
  {
    label: "Konsultan — biar untung",
    lines: [
      {
        who: "you" as const,
        text: "konsultasi cara tentukan harga jual biar untung",
      },
      {
        who: "bot" as const,
        text: "Harga jual = harga pokok + laba yang Anda targetkan.\n\nContoh hitungan (bukan harga toko Anda): pokok Rp 2.800, target laba ~20% → patokan jual sekitar Rp 3.500.\n\nMasukkan pokok barang *di toko Anda* sendiri. Untuk omzet/stok nyata, ketik *laporan* atau *cek stok* — jangan pakai kata tanya.",
      },
      {
        who: "you" as const,
        text: "tanya tip agar warung lebih untung",
      },
      {
        who: "bot" as const,
        text: "Untung naik jika omzet naik atau biaya turun. Prinsipnya: prioritaskan barang yang cepat laku, jaga stok agar tidak kosong, kurangi barang yang mengendap.\n\nIni saran konsep — bukan daftar barang toko Anda. Untuk barang laris di toko, ketik *paling laris*. Untuk omzet hari ini, ketik *laporan*.",
      },
    ],
  },
];

/** Extra konsultasi: konsep untung — bedakan dari angka kasir. */
const CONSULT_UNTUNG = [
  {
    who: "you" as const,
    text: "tanya bedanya omzet dan untung",
  },
  {
    who: "bot" as const,
    text: "• Omzet = total penjualan (uang masuk).\n• Untung = omzet dikurangi semua biaya (beli barang, sewa, listrik, dll.).\n\nOmzet besar belum tentu untung besar.\n\nAngka omzet toko Anda: ketik *laporan*.",
  },
  {
    who: "you" as const,
    text: "pendamping cara hitung margin keuntungan",
  },
  {
    who: "bot" as const,
    text: "Rumus kasar:\nmargin ≈ (harga jual − harga beli) ÷ harga jual × 100%.\n\nContoh hitungan (bukan data toko Anda): jual Rp 5.000, beli Rp 4.000 → margin 20%.\n\nGanti dengan harga beli & jual *barang Anda*. Setelah itu kurangi biaya tetap untuk perkiraan untung bersih.",
  },
  {
    who: "you" as const,
    text: "tanya kenapa stok kosong bisa bikin rugi omzet",
  },
  {
    who: "bot" as const,
    text: "Kalau barang yang sering dibeli habis, pembeli pergi — omzet hari itu hilang meski toko buka.\n\nIni prinsip, bukan daftar stok toko Anda.\n• Mau tahu sisa barang? Ketik *cek stok …* atau *stok mau habis*\n• Mau tahu yang laris? Ketik *paling laris*",
  },
];

/** Simulasi daftar — copy 1:1 dari kasir-pipe/register.py + kasir-tools. */
const SIMULASI_DAFTAR: { who: "you" | "bot"; text: string }[] = [
  { who: "you", text: "halo" },
  {
    who: "bot",
    text: "Halo! Ini *kasir WhatsApp* untuk warung UMKM.\n\nKetik *DAFTAR* untuk mendaftarkan toko Anda, atau hubungi admin jika sudah punya akun.",
  },
  { who: "you", text: "DAFTAR" },
  { who: "bot", text: "Nama tokonya apa? (contoh: Warung Bu Ani)" },
  { who: "you", text: "Toko Sari" },
  {
    who: "bot",
    text: "Toko *Toko Sari* akan didaftarkan dengan nomor *6281234567890* sebagai pemilik.\n\nKetik *YA* untuk kirim ke admin, atau *BATAL* untuk batalkan.",
  },
  { who: "you", text: "YA" },
  {
    who: "bot",
    text: "Draft *Toko Sari* sudah dikirim.\nTunggu approve admin (biasanya segera).\nKetik *STATUS* untuk cek.",
  },
  { who: "you", text: "STATUS" },
  {
    who: "bot",
    text: "*Toko Sari* masih menunggu approve admin. Ketik *STATUS* lagi nanti.",
  },
  { who: "you", text: "STATUS" },
  {
    who: "bot",
    text: "*Toko Sari* sudah aktif. Coba ketik: *cek stok* atau *laporan*.",
  },
  { who: "you", text: "cek stok" },
  { who: "bot", text: "Belum ada data stok." },
];
const HERO_THREAD: {
  who: "you" | "bot";
  text: string;
  poll?: boolean;
}[] = [
  { who: "you", text: "cek stok indomie" },
  {
    who: "bot",
    text: "📦 *Cek Stok*\n\n• Indomie Goreng — sisa *12*\n• Indomie Ayam Bawang — sisa *4*",
  },
  { who: "you", text: "stok mau habis" },
  {
    who: "bot",
    text: "⚠️ *Stok menipis* (sisa ≤ 10)\n\n1. *Indomie Ayam Bawang* — sisa *4*\n2. *Teh Botol* — sisa *7*\n\nPaling kritis: *Indomie Ayam Bawang*.",
  },
];

function PollButtons() {
  return (
    <div
      className="mr-auto mt-1 flex max-w-[90%] flex-col overflow-hidden rounded-xl bg-white/95 text-sm shadow-sm ring-1 ring-black/5"
      style={{ color: "#075e54" }}
    >
      <div className="border-b border-black/5 px-3 py-2 text-xs font-medium text-neutral-500">
        Konfirmasi penjualan
      </div>
      <button
        type="button"
        tabIndex={-1}
        className="border-b border-black/5 px-3 py-2.5 text-left font-semibold"
      >
        Ya, simpan
      </button>
      <button
        type="button"
        tabIndex={-1}
        className="px-3 py-2.5 text-left font-semibold"
      >
        Batal
      </button>
    </div>
  );
}

function Bubble({
  who,
  text,
  poll,
}: {
  who: "you" | "bot";
  text: string;
  poll?: boolean;
}) {
  const mine = who === "you";
  return (
    <div className="flex flex-col gap-1">
      <div
        className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[0.88rem] leading-snug shadow-sm ${
          mine
            ? "ml-auto rounded-br-md bg-[var(--kasir-bubble-out)]"
            : "mr-auto rounded-bl-md bg-white ring-1 ring-[var(--kasir-leaf)]/20"
        }`}
        style={{ color: "#14201a" }}
      >
        {text}
      </div>
      {poll ? <PollButtons /> : null}
    </div>
  );
}

export default function KasirLandingPage() {
  const reduce = useReducedMotion();

  return (
    <main className="overflow-x-hidden">
      <header className="kasir-hero-atmosphere relative min-h-[100svh] overflow-hidden">
        <div className="relative z-10 mx-auto grid min-h-[100svh] max-w-6xl items-center gap-10 px-5 pb-16 pt-10 md:grid-cols-[1.05fr_0.95fr] md:gap-12 md:px-8 md:pb-20 md:pt-14">
          <div>
            <p
              className="kasir-display text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl"
              style={{ color: "#0f3d2c" }}
            >
              NusantaraSoft
            </p>
            <h1
              className="kasir-display mt-5 max-w-xl text-[1.85rem] font-semibold leading-[1.15] sm:text-4xl md:text-[2.65rem]"
              style={{ color: "#14201a" }}
            >
              Kasir warung di WhatsApp
            </h1>
            <p
              className="mt-5 max-w-lg text-base leading-relaxed sm:text-lg"
              style={{ color: "#3d4f45" }}
            >
              Cek stok, catat jual, laporan malam, plus tanya tips usaha — di
              WhatsApp, tanpa unduh app.
            </p>
            <p
              className="mt-3 max-w-lg text-sm leading-relaxed"
              style={{ color: "#5a6b62" }}
            >
              Ketik{" "}
              <span className="font-semibold" style={{ color: "#0f3d2c" }}>
                DAFTAR
              </span>{" "}
              ke {WA_DISPLAY}. Kerja sama dijelaskan tim setelah toko disetujui.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={WA_URL}
                className="inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ backgroundColor: "#1b6b4a" }}
              >
                Chat {WA_DISPLAY}
              </a>
              <a
                href="#contoh"
                className="inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-semibold underline-offset-4 transition hover:underline"
                style={{ color: "#0f3d2c" }}
              >
                Lihat contoh chat
              </a>
              <a
                href="#daftar"
                className="inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-semibold underline-offset-4 transition hover:underline"
                style={{ color: "#0f3d2c" }}
              >
                Cara daftar
              </a>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="kasir-float relative -mx-5 md:mx-0 md:justify-self-stretch"
          >
            <div className="relative max-h-[min(38rem,72svh)] overflow-y-auto overflow-x-hidden bg-[linear-gradient(180deg,var(--kasir-wa-deep),var(--kasir-wa))] px-4 pb-6 pt-10 shadow-[0_24px_60px_-28px_rgba(15,61,44,0.55)] md:rounded-l-3xl md:pl-6">
              <div className="sticky top-0 z-10 -mx-4 mb-2 flex h-9 items-center gap-2 bg-[var(--kasir-wa-deep)]/95 px-4 text-xs font-medium text-white/90 backdrop-blur-sm md:-mx-6 md:pl-6">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                Kasir NusantaraSoft
              </div>
              <div className="mt-1 flex flex-col gap-2.5">
                {HERO_THREAD.map((line, i) => (
                  <Bubble
                    key={`hero-${i}`}
                    who={line.who}
                    text={line.text}
                    poll={line.poll}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="border-t border-[var(--kasir-leaf)]/10 bg-[var(--kasir-mist)]/50 px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="kasir-display text-3xl font-semibold text-[var(--kasir-ink)] md:text-4xl">
            Di warung, yang sering terjadi
          </h2>
          <p className="mt-3 max-w-xl text-[var(--kasir-ink-soft)]">
            Empat hal yang sering bikin stok dan omzet kacau.
          </p>
          <ul className="mt-10 space-y-5">
            {[
              ["Jual lupa dicatat", "Stok di kepala beda dengan rak"],
              ["Malam hanya hitung kas", "Omzet & barang laris tidak jelas"],
              ["App kasir ribet", "Lupa buka, takut salah tekan"],
              ["Bingung soal usaha", "Menunggu pelatihan, atau diam saja"],
            ].map(([title, body], i) => (
              <motion.li
                key={title}
                initial={reduce ? false : { opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="grid gap-1 border-l-2 border-[var(--kasir-leaf)] pl-4 sm:grid-cols-[11rem_1fr] sm:gap-6"
              >
                <span className="font-semibold text-[var(--kasir-leaf-deep)]">
                  {title}
                </span>
                <span className="text-[var(--kasir-ink-soft)]">{body}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Hari tanpa vs dengan ─────────────────────────────── */}
      <section
        id="hari"
        className="scroll-mt-8 border-t border-[var(--kasir-leaf)]/10 px-5 py-20 md:px-8"
      >
        <div className="mx-auto max-w-3xl">
          <h2
            className="kasir-display text-3xl font-semibold md:text-4xl"
            style={{ color: "#14201a" }}
          >
            Satu hari di warung
          </h2>
          <p className="mt-3 max-w-xl text-[var(--kasir-ink-soft)]">
            Tanpa catatan rapi vs dengan chat di WhatsApp yang sudah dipakai.
          </p>
          <div className="mt-10 grid gap-10 sm:grid-cols-2">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-[0.14em]"
                style={{ color: "#8a6a4a" }}
              >
                Tanpa kasir WA
              </p>
              <ul className="mt-4 space-y-3 text-[var(--kasir-ink-soft)]">
                {[
                  "Pagi: tebak stok dari ingatan",
                  "Siang: jual lupa dicatat, ulang dari nol",
                  "Sore: belanja supplier tidak masuk catatan",
                  "Malam: hitung kas saja — omzet & laris gelap",
                ].map((t) => (
                  <li
                    key={t}
                    className="border-l-2 border-[var(--kasir-leaf)]/25 pl-4"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-[0.14em]"
                style={{ color: "#1b6b4a" }}
              >
                Dengan kasir WA
              </p>
              <ul className="mt-4 space-y-3 text-[var(--kasir-ink-soft)]">
                {[
                  "Pagi: cek stok / stok mau habis",
                  "Siang: jual → Ya, simpan (atau Batal)",
                  "Sore: belanja / restock tercatat",
                  "Malam: laporan → tutup toko (omzet + stok menipis)",
                ].map((t) => (
                  <li
                    key={t}
                    className="border-l-2 border-[var(--kasir-leaf)] pl-4"
                    style={{ color: "#14201a" }}
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-8 max-w-xl text-sm text-[var(--kasir-ink-soft)]">
            Siang juga boleh{" "}
            <span className="font-medium" style={{ color: "#0f3d2c" }}>
              tanya
            </span>{" "}
            /{" "}
            <span className="font-medium" style={{ color: "#0f3d2c" }}>
              konsultasi
            </span>{" "}
            tips usaha — beda jalur dari angka stok toko.
          </p>
        </div>
      </section>

      <section id="contoh" className="scroll-mt-8 px-5 py-20 md:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="kasir-display text-3xl font-semibold text-[var(--kasir-ink)] md:text-4xl">
            Contoh chat seperti di WhatsApp
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--kasir-ink-soft)]">
            Jangan campur:{" "}
            <strong className="font-semibold text-[var(--kasir-ink)]">
              tanpa
            </strong>{" "}
            kata tanya/konsultasi = angka toko (kasir).{" "}
            <strong className="font-semibold text-[var(--kasir-ink)]">
              Dengan
            </strong>{" "}
            tanya / konsultasi / pendamping = tips usaha (bukan stok/omzet
            toko).
          </p>
          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {CHATS.map((c) => (
              <div key={c.label} className="flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--kasir-leaf)]">
                  {c.label}
                </p>
                <div className="flex flex-1 flex-col gap-2.5 rounded-2xl bg-[linear-gradient(180deg,#075e54,#128c7e)] p-3 pt-8 shadow-md">
                  <div className="-mt-5 mb-1 flex items-center gap-2 text-[11px] font-medium text-white/90">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    Kasir NusantaraSoft
                  </div>
                  {c.lines.map((line, j) => (
                    <Bubble
                      key={`${c.label}-${j}`}
                      who={line.who}
                      text={line.text}
                      poll={"poll" in line ? line.poll : undefined}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14">
            <h3
              className="kasir-display text-2xl font-semibold md:text-3xl"
              style={{ color: "#0f3d2c" }}
            >
              Konsultasi lagi — biar untung
            </h3>
            <p className="mt-2 max-w-2xl text-[var(--kasir-ink-soft)]">
              Semua jawaban di bawah = tips konsultan. Angka Rp di contoh =
              ilustrasi rumus,{" "}
              <strong className="font-semibold text-[var(--kasir-ink)]">
                bukan
              </strong>{" "}
              harga/stok toko Anda. Mau angka toko → ketik{" "}
              <span className="font-medium">laporan</span>,{" "}
              <span className="font-medium">cek stok</span>, atau{" "}
              <span className="font-medium">paling laris</span> (tanpa kata
              tanya).
            </p>
            <div className="mt-6 mx-auto max-w-xl rounded-2xl bg-[linear-gradient(180deg,#075e54,#128c7e)] p-3 pt-8 shadow-md">
              <div className="-mt-5 mb-1 flex items-center gap-2 text-[11px] font-medium text-white/90">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Kasir NusantaraSoft · konsultan
              </div>
              <div className="flex flex-col gap-2.5">
                {CONSULT_UNTUNG.map((line, j) => (
                  <Bubble
                    key={`untung-${j}`}
                    who={line.who}
                    text={line.text}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust: jujur soal angka ──────────────────────────── */}
      <section className="border-t border-[var(--kasir-leaf)]/10 bg-[var(--kasir-mist)]/40 px-5 py-16 md:px-8">
        <div className="mx-auto max-w-3xl">
          <h2
            className="kasir-display text-2xl font-semibold md:text-3xl"
            style={{ color: "#0f3d2c" }}
          >
            Jujur soal angka
          </h2>
          <ul className="mt-6 space-y-4 text-[var(--kasir-ink-soft)]">
            <li className="border-l-2 border-[var(--kasir-leaf)] pl-4">
              <span className="font-semibold" style={{ color: "#14201a" }}>
                Stok, harga, omzet
              </span>{" "}
              = data toko Anda yang sudah dicatat — bukan tebak AI.
            </li>
            <li className="border-l-2 border-[var(--kasir-leaf)] pl-4">
              <span className="font-semibold" style={{ color: "#14201a" }}>
                Konsultan
              </span>{" "}
              = tips usaha singkat dari buku kurikulum — bukan angka stok/omzet
              toko, bukan omongan bebas.
            </li>
            <li className="border-l-2 border-[var(--kasir-leaf)] pl-4">
              Jual & belanja{" "}
              <span className="font-semibold" style={{ color: "#14201a" }}>
                tidak langsung
              </span>{" "}
              potong stok: ringkasan dulu →{" "}
              <span className="font-medium">Ya, simpan</span> atau{" "}
              <span className="font-medium">Batal</span>.
            </li>
          </ul>
        </div>
      </section>

      <section className="border-y border-[var(--kasir-leaf)]/10 bg-[var(--kasir-leaf-deep)] px-5 py-20 text-[var(--kasir-paper)] md:px-8">
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2">
          <div>
            <h2 className="kasir-display text-3xl font-semibold md:text-4xl">
              Kasir
            </h2>
            <p className="mt-3 text-white/75">
              Data toko Anda — stok, jual, belanja, laporan, tutup toko.
            </p>
            <ul className="mt-8 space-y-2.5 text-[0.95rem] text-white/90">
              {[
                "cek stok …",
                "jual … → Ya / Batal",
                "satu lagi",
                "belanja / restock",
                "laporan · paling laris · tutup toko",
              ].map((t) => (
                <li key={t} className="font-mono text-sm text-emerald-100/90">
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="kasir-display text-3xl font-semibold md:text-4xl">
              Konsultan
            </h2>
            <p className="mt-3 text-white/75">
              Saran konsultan usaha — mulai dengan kata kunci ini.
            </p>
            <ul className="mt-8 space-y-2.5 text-[0.95rem] text-white/90">
              {[
                "tanya …",
                "konsultasi …",
                "pendamping …",
                "Bukan angka stok toko",
                "Bukan ChatGPT bebas",
              ].map((t) => (
                <li key={t} className="font-mono text-sm text-emerald-100/90">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Beda dari app ────────────────────────────────────── */}
      <section className="px-5 py-14 md:px-8">
        <div className="mx-auto max-w-3xl">
          <p
            className="text-lg leading-relaxed md:text-xl"
            style={{ color: "#14201a" }}
          >
            App kasir harus dibuka dulu. Ini tetap di{" "}
            <span className="font-semibold" style={{ color: "#0f3d2c" }}>
              WhatsApp yang sudah dipakai setiap hari
            </span>{" "}
            — kasir dan konsultan di nomor yang sama.
          </p>
        </div>
      </section>

      {/* ── Cara daftar + simulasi ──────────────────────────── */}
      <section id="daftar" className="scroll-mt-8 px-5 py-20 md:px-8">
        <div className="mx-auto max-w-5xl">
          <h2
            className="kasir-display text-3xl font-semibold md:text-4xl"
            style={{ color: "#14201a" }}
          >
            Cara daftar
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--kasir-ink-soft)]">
            Tidak perlu app. Chat ke nomor WhatsApp bisnis, daftar, tunggu
            disetujui, lalu coba <span className="font-medium">cek stok</span>.
          </p>

          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: "1",
                t: "Chat nomor bisnis",
                d: `Buka WhatsApp ke ${WA_DISPLAY}, atau tekan tombol di bawah.`,
              },
              {
                n: "2",
                t: "Ketik DAFTAR",
                d: "Isi nama toko, lalu ketik YA untuk kirim.",
              },
              {
                n: "3",
                t: "Tunggu approve",
                d: "Biasanya hari yang sama. Cek antrean dengan STATUS.",
              },
              {
                n: "4",
                t: "Cek stok",
                d: "Kalau dijawab, toko sudah hidup. Mulai jual atau tanya tips.",
              },
            ].map((step, i) => (
              <motion.div
                key={step.n}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="border-l-2 border-[var(--kasir-leaf)] pl-4"
              >
                <span
                  className="kasir-display text-3xl font-semibold"
                  style={{ color: "#1b6b4a" }}
                >
                  {step.n}
                </span>
                <p className="mt-1 text-lg font-semibold" style={{ color: "#14201a" }}>
                  {step.t}
                </p>
                <p className="mt-1 text-sm text-[var(--kasir-ink-soft)]">
                  {step.d}
                </p>
              </motion.div>
            ))}
          </ol>

          <div id="simulasi" className="mt-16 scroll-mt-8">
            <h3
              className="kasir-display text-2xl font-semibold md:text-3xl"
              style={{ color: "#0f3d2c" }}
            >
              Simulasi daftar
            </h3>
            <p className="mt-2 max-w-xl text-[var(--kasir-ink-soft)]">
              Teks di bawah sama dengan balasan bot di WhatsApp — dari chat
              pertama sampai toko hidup.
            </p>
            <div className="mt-6 mx-auto max-w-xl rounded-2xl bg-[linear-gradient(180deg,#075e54,#128c7e)] p-3 pt-8 shadow-md">
              <div className="-mt-5 mb-1 flex items-center gap-2 text-[11px] font-medium text-white/90">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Kasir NusantaraSoft · daftar
              </div>
              <div className="flex max-h-[28rem] flex-col gap-2.5 overflow-y-auto pr-1">
                {SIMULASI_DAFTAR.map((line, j) => (
                  <Bubble
                    key={`daftar-${j}`}
                    who={line.who}
                    text={line.text}
                  />
                ))}
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-[var(--kasir-ink-soft)]">
              Ditolak / batal? Boleh ketik <span className="font-medium">DAFTAR</span>{" "}
              lagi.
            </p>
            <div className="mt-8 flex justify-center">
              <a
                href={WA_URL}
                className="inline-flex items-center justify-center rounded-md px-6 py-3.5 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: "#1b6b4a" }}
              >
                Ketik DAFTAR · {WA_DISPLAY}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Keberatan + CTA ──────────────────────────────────── */}
      <section
        id="tanya-jawab"
        className="scroll-mt-8 border-t border-[var(--kasir-leaf)]/10 bg-[var(--kasir-mist)]/50 px-5 py-20 md:px-8"
      >
        <div className="mx-auto max-w-3xl">
          <h2
            className="kasir-display text-3xl font-semibold md:text-4xl"
            style={{ color: "#14201a" }}
          >
            Kalau masih ragu
          </h2>
          <ul className="mt-10 space-y-6">
            {[
              [
                "Salah ketik jual?",
                "Bot kirim ringkasan dulu. Ketuk Batal atau ketik batal — stok belum berubah sampai Ya, simpan.",
              ],
              [
                "Harus tunggu approve?",
                "Ya — biasanya hari yang sama. Ketik STATUS untuk cek antrean. Kami saring dulu supaya nomor bisnis tidak penuh spam.",
              ],
              [
                "Data toko aman?",
                "Angka stok/omzet milik toko Anda. Konsultan tidak membaca ledger untuk menjawab tips. Satu nomor pemilik per toko di v1.",
              ],
            ].map(([q, a]) => (
              <li key={q} className="border-l-2 border-[var(--kasir-leaf)] pl-4">
                <p className="font-semibold" style={{ color: "#0f3d2c" }}>
                  {q}
                </p>
                <p className="mt-1 text-[var(--kasir-ink-soft)]">{a}</p>
              </li>
            ))}
          </ul>
          <p className="mt-10 max-w-xl text-sm text-[var(--kasir-ink-soft)]">
            Ketik{" "}
            <span className="font-semibold" style={{ color: "#0f3d2c" }}>
              DAFTAR
            </span>{" "}
            ke {WA_DISPLAY}. Kerja sama dijelaskan tim setelah toko disetujui.
          </p>
          <div className="mt-6">
            <a
              href={WA_URL}
              className="inline-flex items-center justify-center rounded-md px-6 py-3.5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: "#1b6b4a" }}
            >
              Ketik DAFTAR · {WA_DISPLAY}
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--kasir-leaf)]/15 px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="kasir-display text-xl font-semibold text-[var(--kasir-leaf-deep)]">
              NusantaraSoft
            </p>
            <p className="mt-1 text-sm text-[var(--kasir-ink-soft)]">
              Kasir WhatsApp untuk warung
            </p>
          </div>
          <p className="text-xs text-[var(--kasir-ink-soft)]">
            WhatsApp bisnis:{" "}
            <a
              href={WA_URL}
              className="font-medium underline-offset-2 hover:underline"
              style={{ color: "#0f3d2c" }}
            >
              {WA_DISPLAY}
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
