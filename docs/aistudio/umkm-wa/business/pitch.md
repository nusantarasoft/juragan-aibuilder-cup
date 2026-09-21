# Business Support System (WhatsApp UMKM) — ringkasan untuk sales & tenant

**Untuk siapa:** sales, orang bisnis, pemilik toko (tenant).  
**Bukan** catatan teknis development — itu di folder terpisah.

**Satu lembar untuk owner usaha mikro** (masalah → solusi → contoh chat): [penawaran-usaha-mikro.md](./penawaran-usaha-mikro.md).  
**Landing jual:** `/kasir` — wedge *dua kerjaan, satu chat*, hari tanpa/dengan, trust angka, beda app, cara daftar, keberatan + CTA **DAFTAR**.

**Satu kalimat (wedge):** **Business Support System di WhatsApp** (**+62 811-924-689**) — cek stok, catat jual, laporan, tutup toko, plus tips usaha (`tanya` / `konsultasi` / `pendamping`) — **tanpa unduh app**. Owner ketik **DAFTAR** → admin setujui → toko hidup kalau **`cek stok` dijawab**.

**Beda dari app kasir (satu baris sales):** app harus dibuka dulu; ini tetap di WhatsApp yang sudah dipakai setiap hari.

**Soft line komersial (boleh diucapkan):** detail kerja sama dijelaskan tim setelah approve — **bukan** bayar di chat. Jangan sebut angka harga di soft GA kecuali sudah disepakati.

Tanpa DAFTAR + Approve, nomor yang belum dikenal tidak dilayani sebagai BSS (bot diam atau hanya mengarahkan daftar).

---

## Siapa yang terlibat

| Peran | Yang dilakukan |
|-------|----------------|
| **Pemilik toko** | Chat WhatsApp: DAFTAR, tunggu, lalu pakai BSS (stok / jual / tips) |
| **Admin** | Setujui / tolak di halaman UMKM AI Studio |

Karyawan / banyak nomor HP per toko: belum di v1.

---

## Aturan produk v1 (mudah diingat)

| # | Aturan |
|---|--------|
| 1 | Hanya pemilik (WA) + admin (CMS) |
| 2 | Siapa pun boleh mulai **DAFTAR**; admin yang menyaring |
| 3 | Harapan antrean: **hari yang sama / ≤24 jam** (draft hangus setelah 7 hari) |
| 4 | Toko dianggap hidup kalau setelah Approve, **`cek stok` dijawab** |
| 5 | Setelah ditolak / batal, boleh **DAFTAR lagi** |
| 6 | **Satu toko = satu nomor** pemilik di v1 |
| 7 | **Satu nomor WhatsApp bisnis** NusantaraSoft untuk banyak toko (beda toko = beda HP pengirim) |
| 8 | **Chat teks utama** — foto/suara boleh jadi input jual kalau saklar multimodal **ON** (soft GA ops); kalau OFF, bot minta ketik teks (lihat L0c) |

---

## Alur yang dijual

```text
Chat nomor NS  →  DAFTAR  →  nama toko  →  YA
       →  tunggu admin (≤24 jam) / ketik STATUS
       →  Admin Approve di /admin/ai-studio/umkm
       →  cek stok  =  toko hidup
```

Admin juga bisa menambah toko lewat form lama di halaman yang sama; jalur **DAFTAR** adalah yang paling mudah dijelaskan ke calon tenant.

**Belum di v1 (janji sales):** OTP, pembayaran di chat, banyak toko per nomor, multi-PDF / SOP per toko, sitasi halaman PDF (saklar ops `KASIR_CONSULT_CITE_PAGES` — default OFF).

**Soft GA (2026-09-20):** konsultasi kurikulum (`tanya`…) **ON**; multimodal foto/suara **ON** di prod (ops bisa matikan `KASIR_MULTIMODAL` / `KASIR_CONSULT`). Angka stok/omzet **tetap** dari kasir DB — tidak pernah dari RAG buku.

---

## Setelah toko hidup — yang bisa dilakukan owner

Semua lewat **chat teks** ke nomor bisnis yang sama (bukan app terpisah):

| Bilang kira-kira… | Yang terjadi |
|-------------------|--------------|
| *cek stok indomie* | Sisa barang |
| *stok mau habis* | Daftar yang menipis |
| *daftar barang* / *katalog* | Daftar produk toko |
| *jual 2 indomie* / *ada yang beli…* | Ringkasan → ketuk **Ya, simpan** / **Batal** (atau ketik *ya* / *batal*) |
| *satu lagi* / *ulang yang tadi* | Ulang item jual terakhir (masih perlu *ya*) |
| *belanja / restock…* | Ringkasan belanja → *ya* |
| *laporan* | Omzet & ringkasan |
| *paling laris* / *best seller* | Produk terlaris |
| *tutup toko* / *mau pulang* | Omzet hari ini + stok menipis (ritual closing) |
| *tanya …* / *konsultasi …* / *pendamping …* | Saran singkat dari **buku kurikulum UKM** (bukan stok toko). Soft GA: saklar **ON** di prod; kalau ops matikan, bot bilang belum aktif |
| foto / suara (multimodal ON) | Draft jual/beli dari media → *ya* |
| *STATUS* (saat menunggu Approve) | Cek antrean DAFTAR |

Lembar owner + contoh chat sehari: [penawaran-usaha-mikro.md](./penawaran-usaha-mikro.md).

Angka stok/harga/omzet diambil dari data toko yang sudah Approve — **bukan** “tebak AI” dari dokumen generik. Konsultasi kurikulum hanya dari PDF buku yang diingest — **bukan** dari ledger jual/beli. Lihat [L0d](../../../../diagrams/aistudio/umkm-wa/business/L0d-tanya-kurikulum.svg): *cek stok* ≠ *tanya bisnis*.

---

## Gambar (cerita bisnis)

| Level | Gambar | Isi |
|-------|--------|-----|
| Cerita besar | [L0](../../../../diagrams/aistudio/umkm-wa/business/L0-bisnis-besar.svg) | DAFTAR → Approve → kasir |
| Ritual harian | [L0b](../../../../diagrams/aistudio/umkm-wa/business/L0b-kasir-harian.svg) | stok / jual / ya / laporan / **tutup toko** / **tanya** |
| Chat teks + multimodal | [L0c](../../../../diagrams/aistudio/umkm-wa/business/L0c-chat-only.svg) | Foto/suara: ON → draft jual; OFF → ketik teks |
| Tanya vs stok | [L0d](../../../../diagrams/aistudio/umkm-wa/business/L0d-tanya-kurikulum.svg) | Tips buku ≠ angka toko |
| Satu nomor, banyak toko | [L1](../../../../diagrams/aistudio/umkm-wa/business/L1-shared-inbox.svg) | Shared inbox |
| Siapa melakukan apa | [L2](../../../../diagrams/aistudio/umkm-wa/business/L2-aktor-swimlane.svg) | Owner vs admin |

Sumber Mermaid (kalau SVG belum di-render ulang): file `.mmd` di folder diagram yang sama.

---

## Di mana di AI Studio

```text
AI Studio
├── Studio (dokumen / notebook)
├── Settings / Gateway
└── UMKM  /admin/ai-studio/umkm   ← antrean Menunggu approve + daftar toko
```

---

## Tim internal & development

- Runbook trial / checklist internal: [ops/](./ops/)
- Catatan sistem (development): [../system/](../system/)
