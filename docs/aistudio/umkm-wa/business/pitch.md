# Kasir WhatsApp UMKM — ringkasan untuk sales & tenant

**Untuk siapa:** sales, orang bisnis, pemilik toko (tenant).  
**Bukan** catatan teknis development — itu di folder terpisah.

Satu kalimat: pemilik warung chat ke **nomor WhatsApp bisnis NusantaraSoft** → ketik **DAFTAR** → admin setujui di AI Studio → toko aktif → bisa **cek stok**, catat jual/beli, dan lihat laporan lewat **chat teks**.

Tanpa DAFTAR + Approve, nomor yang belum dikenal tidak dilayani sebagai kasir (bot diam atau hanya mengarahkan daftar).

---

## Siapa yang terlibat

| Peran | Yang dilakukan |
|-------|----------------|
| **Pemilik toko** | Chat WhatsApp: DAFTAR, tunggu, lalu pakai kasir |
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
| 8 | **Chat teks dulu** — default: foto/suara → bot minta ketik *jual* / *stok*; jual dari media hanya kalau admin ops menyalakan (bukan default produk) |

---

## Alur yang dijual

```text
Chat nomor NS  →  DAFTAR  →  nama toko  →  YA
       →  tunggu admin (≤24 jam) / ketik STATUS
       →  Admin Approve di /admin/ai-studio/umkm
       →  cek stok  =  toko hidup
```

Admin juga bisa menambah toko lewat form lama di halaman yang sama; jalur **DAFTAR** adalah yang paling mudah dijelaskan ke calon tenant.

**Belum di v1:** OTP, pembayaran di chat, banyak toko per nomor. Jual dari foto/suara **bukan** janji default — produk yang dijual tetap chat teks (lihat L0c); kalau media dikirim tanpa saklar ops, bot minta ketik teks.

---

## Setelah toko hidup — yang bisa dilakukan owner

Semua lewat **chat teks** ke nomor bisnis yang sama (bukan app terpisah):

| Bilang kira-kira… | Yang terjadi |
|-------------------|--------------|
| *cek stok indomie* | Sisa barang |
| *stok mau habis* | Daftar yang menipis |
| *jual 2 indomie* / *ada yang beli…* | Ringkasan → ketuk **Ya, simpan** / **Batal** (atau ketik *ya* / *batal*) |
| *satu lagi* | Ulang item jual terakhir (masih perlu *ya*) |
| *belanja / restock…* | Ringkasan belanja → *ya* |
| *laporan* / *paling laris* | Omzet & ringkasan |
| *tutup toko* | Omzet hari ini + stok menipis (ritual closing) |

Angka stok/harga/omzet diambil dari data toko yang sudah Approve — **bukan** “tebak AI” dari dokumen generik.

---

## Gambar (cerita bisnis)

| Level | Gambar | Isi |
|-------|--------|-----|
| Cerita besar | [L0](../../../../diagrams/aistudio/umkm-wa/business/L0-bisnis-besar.svg) | DAFTAR → Approve → kasir |
| Ritual harian | [L0b](../../../../diagrams/aistudio/umkm-wa/business/L0b-kasir-harian.svg) | stok / jual / ya / laporan / **tutup toko** |
| Chat teks dulu | [L0c](../../../../diagrams/aistudio/umkm-wa/business/L0c-chat-only.svg) | foto/suara → ketik jual/stok |
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
