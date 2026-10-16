# Business Support System di WhatsApp

**Satu lembar penawaran** — untuk pemilik warung / toko kelontong / usaha mikro.  
Baca 2–3 menit. Intinya: **contoh chat** (bukan jargon).

**Apa ini:** Business Support System di WhatsApp — cek stok, catat jual, laporan, tutup toko, plus tanya tips usaha (harga, modal, untung). Satu nomor chat, tanpa unduh app.

**Nomor WhatsApp bisnis (DAFTAR):** **+62 811-924-689**  
Link cepat: `https://wa.me/62811924689?text=DAFTAR`

**Landing page (web):** route **`/kasir`** — tombol CTA mengarah ke nomor di atas (bisa dioverride env `NEXT_PUBLIC_KASIR_WA_URL` jika perlu).

**Mulai:** ketik **DAFTAR** ke nomor di atas. Tim jelaskan kerja sama setelah toko disetujui — **tidak ada bayar di dalam chat**.

---

## Masalah yang sering terjadi

| Di warung… | Akibatnya |
|------------|-----------|
| Jual barang, lupa dicatat | Stok di kepala ≠ stok di rak |
| Pembeli beli yang sama berulang | Capek ketik ulang dari nol |
| Malam hitung uang kas saja | Tidak tahu omzet / apa yang laris |
| Mau cek “masih ada nggak?” | Harus berdiri, hitung manual |
| Belanja ke supplier | Tidak tercatat → stok salah |
| Ada app kasir | Lupa buka / ribet / takut salah tekan |
| Bingung soal usaha (modal, harga jual, kelola toko) | Tanya tetangga / YouTube / diam — atau menunggu pelatihan yang jauh |

Anda sudah pakai **WhatsApp** setiap hari. Jadi operasional toko **dan** konsultan juga di situ — **tanpa app baru, tanpa laptop**.

**Beda dari app kasir:** app harus dibuka dulu; ini tetap di WhatsApp yang sudah dipakai — stok/jual dan konsultan di nomor yang sama.

---

## Solusi singkat

```text
HP Anda  →  WhatsApp  →  nomor NS
              ├─ data toko: stok / jual / belanja / laporan / tutup toko
              └─ konsultan: tanya / konsultasi / pendamping (+ pertanyaan bisnis)
```

1. Ketik **DAFTAR** → nama toko → **YA**  
2. Kami setujui (biasanya hari yang sama; cek dengan **STATUS**)  
3. Toko hidup kalau **`cek stok`** sudah dijawab  

**Aman:** jual/belanja **tidak langsung** potong stok. Bot kirim ringkasan dulu → Anda ketuk **Ya, simpan** atau **Batal**.

### Jujur soal angka (baca dulu)

| | |
|--|--|
| **Stok / harga / omzet** | Data **toko Anda** yang dicatat — **bukan** tebak AI |
| **Konsultan** | Tips dari buku kurikulum — **bukan** angka stok/omzet toko, **bukan** omongan bebas |
| **Ya / Batal** | Melindungi dari salah ketik sebelum stok berubah |

---

## Satu hari di “Toko Sari” (cerita + chat)

**Tanpa BSS:** pagi tebak stok → siang jual lupa → malam hanya hitung kas.  
**Dengan BSS:** pagi `cek stok` → siang jual + Ya → malam `laporan` + **`tutup toko`**. Siang juga boleh `tanya` / `konsultasi` tips (bukan angka toko).

### Pagi — cek rak & katalog

```text
Anda:  cek stok indomie
Bot:   📦 *Cek Stok*

       • Indomie Goreng — sisa *12*
       • Indomie Ayam Bawang — sisa *4*

Anda:  stok mau habis
Bot:   ⚠️ *Stok menipis* (sisa ≤ 10)

       1. *Indomie Ayam Bawang* — sisa *4*
       2. *Teh Botol* — sisa *7*

       Paling kritis: *Indomie Ayam Bawang*.

Anda:  daftar barang
Bot:   📦 *Daftar Barang*

       • Indomie Goreng — Rp 3.500
       • Teh Botol — Rp 5.000
       …
```

### Siang — ada yang beli (bisa ulang cepat)

```text
Anda:  ada yang beli 2 indomie goreng
Bot:   📋 *Konfirmasi penjualan*

       • 2 × Indomie Goreng @ Rp 3.500

       Total: *Rp 7.000*
       Bayar: tunai

       Pilih *Ya, simpan* atau *Batal* di tombol di atas
       (atau ketik *ya* / *batal*).
       [Ya, simpan]  [Batal]

Anda:  Ya, simpan
Bot:   ✅ *Penjualan tercatat*
       No. SO-20260920-014
       Total: Rp 7.000
       Mau ulang item yang sama? Ketik *satu lagi*.

Anda:  satu lagi
Bot:   (draft jual sama → ketuk Ya lagi)
```

Bahasa santai juga boleh: *“jual 2 indomie goreng”* — bot tetap paham.

### Sore — belanja / restock

```text
Anda:  belanja 1 dus indomie goreng
Bot:   📋 *Konfirmasi belanja*
       … Total + tombol Ya, simpan / Batal
```

### Boleh foto atau suara (kalau dinyalakan)

```text
Anda:  (kirim foto nota / rekaman “jual 3 teh botol”)
Bot:   📋 *Konfirmasi penjualan* … → Ya / Batal
```

Kalau belum yakin barang/qty, bot tanya **satu** pertanyaan singkat — tidak mengarang katalog.

### Malam — laporan & tutup toko

```text
Anda:  laporan
Bot:   📊 *Laporan hari ini*

       Penjualan: *14* order
       Total penjualan: *Rp 482.000*
       …

Anda:  paling laris
Bot:   (peringkat barang laris periode ini)

Anda:  tutup toko
Bot:   (laporan hari ini + stok menipis)
       Toko ditutup untuk hari ini. Besok tinggal ketik *jual* / *stok* lagi ya.
```

### Kapan saja — konsultan usaha (poin jual utama)

Mulai **wajib** dengan **tanya**, **konsultasi**, atau **pendamping**.  
Jawaban = tips usaha — **bukan** angka stok/omzet toko Anda.

| Mau… | Ketik… | Sumber jawaban |
|------|--------|----------------|
| Sisa Indomie di toko | `cek stok indomie` | **Kasir** (data toko) |
| Omzet hari ini | `laporan` | **Kasir** |
| Cara hitung harga biar untung | `konsultasi cara tentukan harga jual…` | **Konsultan** |
| Daftar barang laris toko | `paling laris` | **Kasir** |
| Kenapa stok kosong merugikan (konsep) | `tanya kenapa stok kosong bisa bikin rugi omzet` | **Konsultan** |

Angka Rp di contoh konsultan di bawah = **ilustrasi rumus**, bukan harga barang di toko Anda.

```text
Anda:  tanya jenis modal untuk usaha kecil
Bot:   Modal usaha kecil biasanya dari modal sendiri (tabungan/keluarga)
       atau pinjaman (bank, koperasi, keluarga). …

Anda:  konsultasi cara tentukan harga jual biar untung
Bot:   Harga jual = harga pokok + laba yang ditargetkan.

       Contoh hitungan (bukan harga toko Anda): pokok Rp 2.800,
       target laba ~20% → patokan jual sekitar Rp 3.500.

       Masukkan pokok barang di toko Anda sendiri.
       Omzet/stok nyata → ketik laporan / cek stok (tanpa kata tanya).

Anda:  tanya tip agar warung lebih untung
Bot:   Untung naik jika omzet naik atau biaya turun.
       Prioritaskan barang cepat laku, jaga stok, kurangi yang mengendap.

       Ini saran konsep. Barang laris toko → ketik paling laris.
       Omzet hari ini → ketik laporan.

Anda:  tanya bedanya omzet dan untung
Bot:   Omzet = total penjualan; untung = omzet − semua biaya.
       Omzet besar belum tentu untung besar.

       Angka omzet toko Anda → ketik laporan.

Anda:  pendamping cara hitung margin keuntungan
Bot:   Margin ≈ (jual − beli) ÷ jual × 100%.
       Contoh hitungan: jual Rp 5.000, beli Rp 4.000 → 20%.

       Ganti dengan harga beli & jual barang Anda.
       Bukan menebak harga Indomie di toko lewat tanya.

Anda:  tanya kenapa stok kosong bisa bikin rugi omzet
Bot:   Barang laris habis → pembeli pergi → omzet hilang.

       Ini prinsip. Sisa stok toko → cek stok / stok mau habis.
       Yang laris di toko → paling laris.
```

**Ringkas biar tidak ambigu:**

| Awalan chat | Artinya |
|-------------|---------|
| (tanpa tanya) `cek stok` / `jual` / `laporan` / `paling laris` | **Kasir** — angka toko |
| `tanya` / `konsultasi` / `pendamping` + tip usaha | **Konsultan** — tips (bukan angka toko) |

Kalau topik di luar toko & usaha (mis. harga kripto), bot menolak dengan sopan — tidak mengarang.

---

## Cara daftar (4 langkah)

1. Chat nomor WhatsApp bisnis NusantaraSoft  
2. Ketik **DAFTAR** → nama toko → **YA**  
3. Tunggu approve (biasanya hari yang sama); cek dengan **STATUS**  
4. Ketik **cek stok** — kalau dijawab, toko sudah hidup  

Simulasi chat lengkap: lihat landing `/kasir#daftar` (atau contoh di bawah).

## Baru pertama kali — simulasi daftar

Copy di bawah = balasan bot nyata (`kasir-pipe` wizard + `cek stok` kosong).

```text
Anda:  halo
Bot:   Halo! Ini kasir WhatsApp untuk warung UMKM.

       Ketik DAFTAR untuk mendaftarkan toko Anda,
       atau hubungi admin jika sudah punya akun.

Anda:  DAFTAR
Bot:   Nama tokonya apa? (contoh: Warung Bu Ani)
Anda:  Toko Sari
Bot:   Toko Toko Sari akan didaftarkan dengan nomor 6281234567890 sebagai pemilik.

       Ketik YA untuk kirim ke admin, atau BATAL untuk batalkan.
Anda:  YA
Bot:   Draft Toko Sari sudah dikirim.
       Tunggu approve admin (biasanya segera).
       Ketik STATUS untuk cek.

Anda:  STATUS
Bot:   Toko Sari masih menunggu approve admin. Ketik STATUS lagi nanti.

Anda:  STATUS
Bot:   Toko Sari sudah aktif. Coba ketik: cek stok atau laporan.

Anda:  cek stok
Bot:   Belum ada data stok.
```

(Nomor di konfirmasi = nomor WA Anda yang chat.)  
Kalau ditolak / batal, boleh **DAFTAR** lagi.

---

## Ringkas: yang Anda dapat

### Konsultan (beda dari data toko)

| Kebutuhan | Bilang kira-kira… |
|-----------|-------------------|
| Modal, harga jual konsep, kelola usaha | `tanya …` |
| Sama, kata lain | `konsultasi …` / `pendamping …` |

### Operasional harian (data toko)

| Kebutuhan | Bilang kira-kira… |
|-----------|-------------------|
| Sisa barang | `cek stok …` |
| Yang menipis | `stok mau habis` |
| Lihat katalog | `daftar barang` |
| Catat jual | `jual …` / `ada yang beli …` → Ya |
| Ulang jual terakhir | `satu lagi` → Ya |
| Catat belanja | `belanja` / `restock …` → Ya |
| Omzet hari ini | `laporan` |
| Barang laris | `paling laris` |
| Tutup hari | `tutup toko` |
| Input tanpa ketik | foto / suara (jika ON) |
| Cek antrean daftar | `STATUS` |

---

## Yang belum (supaya tidak kecewa)

- Belum bayar / OTP di dalam chat  
- Satu nomor HP = satu toko (belum banyak karyawan per toko)  
- Konsultan = tips bersama untuk semua toko — belum SOP khusus merek toko Anda  
- Konsultan **tidak** mengarang angka stok/omzet toko (itu tugas kasir)  
- Sitasi halaman PDF (`hlm. …`) belum dijanjikan di lembar ini  

---

## Kalau masih ragu

| Pertanyaan | Jawaban singkat |
|------------|-----------------|
| Salah ketik jual? | Ringkasan dulu → **Batal** / *batal* — stok belum berubah sampai **Ya, simpan** |
| Harus tunggu approve? | Ya — biasanya hari yang sama; ketik **STATUS**. Kami saring antrean |
| Data toko aman? | Angka milik toko Anda; konsultan tidak baca ledger untuk tips. Satu pemilik per toko di v1 |

---

## Cara mulai

1. Simpan / chat **+62 811-924-689** (atau buka landing `/kasir` → tombol **Ketik DAFTAR**).  
2. Ketik **DAFTAR** → nama toko → **YA**.  
3. Tunggu disetujui → ketik **`cek stok`**.

Tanpa unduh app. Detail kerja sama dijelaskan tim setelah toko disetujui (**bukan** bayar di chat).

Butuh bantuan: hubungi tim NusantaraSoft yang memberi lembar ini.

---

## Catatan untuk sales / mitra (bukan untuk owner)

Di belakang layar ada **AI Studio** (Admin): antrean Approve toko + notebook kurikulum (PDF terindeks) yang mengisi jawaban **konsultan** saat owner mengetik `tanya` / `konsultasi` / `pendamping`.  
Owner **tidak** perlu buka CMS — cukup WhatsApp.

Detail internal: [pitch.md](./pitch.md) · [ops/](./ops/) · hub [AI Studio](../../README.md).

---

*NusantaraSoft — Business Support System (WhatsApp UMKM) · Soft GA 2026 · Dokumen untuk owner usaha mikro*
