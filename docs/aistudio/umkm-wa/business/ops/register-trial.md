# AI Studio — UMKM WA: konsep bisnis, AIDLC, dan jalur trial

Date: 2026-09-19  
Status: **CEO SCOPE REDUCTION locked** (trial v1)  
Parent (produk): [register-admin-approve.md](./register-admin-approve.md)  
Sistem (Hermes / deploy): [../../system/hermes-architecture.md](../../system/hermes-architecture.md)  
Pitch sales/tenant: [../pitch.md](../pitch.md)

Dokumen **ops internal**: trial, AIDLC, checklist. Sales mulai dari [pitch.md](../pitch.md). Detail runtime: [system/](../../system/).

---

## 1. Konsep bisnis (satu kalimat)

Pemilik warung chat ke nomor bisnis → ketik **DAFTAR** → admin setujui di AI Studio → nomor masuk allowlist → baru boleh pakai **kasir WhatsApp** (catat jual, cek stok, laporan, tutup toko, **tanya kurikulum** — **chat teks**).

Tanpa langkah itu, nomor asing dulu diabaikan (bot “mati”). Funnel ini mengganti silent-drop dengan onboarding yang jelas, tanpa OTP/bayar di v1.

Konsultasi kurikulum (soft GA): lihat [consult-kurikulum.md](./consult-kurikulum.md).

### 1.1 Aturan proses bisnis v1 (locked)

| # | Aturan | Keputusan |
|---|--------|-----------|
| B1 | Aktor | **Owner (WhatsApp)** + **Admin (CMS)** saja |
| B2 | Siapa boleh DAFTAR | **Open funnel** — nomor mana pun boleh mulai; Admin menyaring via Approve/Tolak |
| B3 | SLA pending | Ekspektasi bisnis **hari yang sama / ≤24 jam**; draft kedaluwarsa setelah 7 hari |
| B4 | “Toko hidup” | **Approve + `cek stok` berhasil**. Transaksi jual = fase berikutnya |
| B5 | Setelah Tolak / BATAL | Owner **boleh DAFTAR lagi langsung** |
| B6 | Identitas | **1 toko = 1 nomor owner** di v1 (karyawan / multi-HP = out of scope) |
| B7 | Nomor WA | **1 nomor bisnis NusantaraSoft shared** (bukan 1 nomor per toko) |

**Diagram bisnis (SVG):** pitch sales → L0–L2 (+ L0b, **L0c**) di [pitch.md](../pitch.md). Full ladder termasuk L3–L4: [`diagrams/.../business/`](../../../../../diagrams/aistudio/umkm-wa/business/). System gate: [`L7-inbound-gate.svg`](../../../../../diagrams/aistudio/umkm-wa/system/L7-inbound-gate.svg) · knowledge/SOUL: [`L8-knowledge-soul.svg`](../../../../../diagrams/aistudio/umkm-wa/system/L8-knowledge-soul.svg).

```mermaid
flowchart TB
  subgraph owner["Owner (WhatsApp)"]
    O1[Chat nomor bisnis] --> O2{Sudah allowlist?}
    O2 -->|Tidak| O3[Dapat hint DAFTAR]
    O3 --> O4[DAFTAR → nama toko → YA]
    O4 --> O5[Tunggu ≤24 jam / STATUS]
    O2 -->|Ya| O6[Kasir AIDLC]
    O5 --> O7{Admin putusan}
    O7 -->|Approve| O8[Tunggu sebentar / STATUS]
    O8 --> O6
    O7 -->|Tolak| O9[Boleh DAFTAR lagi]
    O9 --> O4
  end

  subgraph admin["Admin (CMS /admin/ai-studio/umkm)"]
    A1[Lihat Menunggu approve] --> A2{Layak?}
    A2 -->|Ya| A3[Approve 1x]
    A2 -->|Tidak| A4[Tolak ± alasan]
  end

  O4 -.->|pending| A1
  A3 -.->|toko aktif| O8
  A4 -.->|rejected| O9
```

**Definisi sukses bisnis (B4):** setelah Approve, owner mendapat jawaban bermakna untuk `cek stok` (stok kosong tetap valid). Itu bukti kasir hidup; isi katalog & jual pertama = pekerjaan berikutnya.

```mermaid
flowchart LR
  subgraph sebelum["Sebelum"]
    A1[Nomor asing] --> A2[Bot diam / tidak balas]
    A2 --> A3[Tidak ada onboarding]
  end

  subgraph sesudah["Sesudah v1"]
    B1[Nomor asing] --> B2[Balasan: ketik DAFTAR]
    B2 --> B3[Draft pending]
    B3 --> B4[Admin Approve]
    B4 --> B5[Kasir hidup]
  end
```

**Nilai uji coba sukses (= B4):** satu nomor nyata bisa `cek stok` setelah Approve — belum wajib ada transaksi jual.

---

## 2. Di mana ini di peta AI Studio

```
AI Studio (Admin CMS)
├── Studio notebook RAG          ← knowledge / NotebookLM
├── Settings / Gateway           ← provider, pair WA
└── UMKM  /admin/ai-studio/umkm  ← tenant kasir WA  ★ dokumen ini
        ├── Form "Tambah UMKM"     (admin provision — jalur lama)
        └── Antrian "Menunggu approve"  (self-serve DAFTAR — jalur baru)
```

Self-serve **bukan** mengganti form admin; keduanya menghasilkan toko aktif di CMS. Trial menguji jalur **DAFTAR**.

---

## 3. AIDLC — apa artinya di sini (produk)

**AIDLC** di modul UMKM = siklus percakapan kasir setelah toko aktif:

```
pahami pesan → routing intent → preview konfirmasi → commit → evaluasi
```

Contoh setelah toko aktif:

| Pesan owner | Hasil |
|-------------|--------|
| `jual 2 indomie` | Preview jual → `ya` → tercatat |
| `satu lagi` | Ulang item jual terakhir → `ya` |
| `cek stok` | Balasan sisa stok |
| `laporan` / omzet | Ringkasan penjualan |
| `tutup toko` | Omzet hari ini + stok menipis |
| foto / voice (default) | Arahkan ketik jual/stok (chat-only) |

Funnel **DAFTAR** berada **sebelum** AIDLC:

```mermaid
flowchart TB
  WA[Pesan WhatsApp] --> Gate{Nomor di allowlist?}

  Gate -->|Ya| AIDLC[Loop AIDLC kasir]
  Gate -->|Tidak| Reg[Wizard DAFTAR / STATUS / YA]

  Reg --> Pending[Menunggu approve]
  Pending --> CMS[Admin Approve di CMS]
  CMS --> Allow[Toko aktif]
  Allow --> Gate
```

Wizard daftar sengaja sederhana (bukan chat AI penuh): hemat biaya, langkah jelas, hindari penyalahgunaan sebelum toko resmi.

---

## 4. Alur end-to-end (owner + admin)

```mermaid
sequenceDiagram
  actor Owner as Owner (WA)
  actor Admin as Admin CMS

  Owner->>Owner: "halo"
  Note right of Owner: Bot: Ketik DAFTAR …

  Owner->>Owner: DAFTAR → nama toko → YA
  Note right of Owner: Status: tunggu approve / STATUS

  Admin->>Admin: Menunggu approve → Approve 1x
  Note right of Admin: Notifikasi toko aktif (best-effort)

  Owner->>Owner: cek stok
  Note right of Owner: Jawaban stok = toko hidup (B4)
```

Detail teknis gate, plugin, dan GraphQL: [../../system/hermes-architecture.md](../../system/hermes-architecture.md).

---

## 5. State machine pendaftaran (wizard)

```mermaid
stateDiagram-v2
  [*] --> Intro: pesan bebas / belum draft
  Intro --> AskStore: DAFTAR
  AskStore --> Confirm: nama toko
  Confirm --> Pending: YA
  Confirm --> Rejected: BATAL / TIDAK
  AskStore --> Rejected: BATAL
  Pending --> Approved: Admin Approve
  Pending --> Rejected: Admin Tolak / BATAL
  AskStore --> Expired: lewat 7 hari
  Confirm --> Expired: lewat 7 hari
  Pending --> Expired: lewat 7 hari
  Rejected --> AskStore: DAFTAR lagi
  Expired --> AskStore: DAFTAR lagi
  Approved --> [*]: toko aktif → AIDLC
```

Satu nomor hanya boleh punya satu pendaftaran terbuka (draft/pending) pada satu waktu.

Diagram L4: [`L4-wizard-state.svg`](../../../../../diagrams/aistudio/umkm-wa/business/L4-wizard-state.svg)

---

## 6. Gate allowlist (bahasa bisnis)

Setiap pesan: **sudah di allowlist?** → kasir · **belum?** → wizard DAFTAR (atau diam jika fitur daftar dimatikan ops).

Setelah Approve, tunggu sebentar atau ketik **STATUS** sebelum `cek stok` agar status toko sudah terbaca.

Diagram L3: [`L3-gate-teknis.svg`](../../../../../diagrams/aistudio/umkm-wa/business/L3-gate-teknis.svg)  
Implementasi: [system/](../../system/)

---

## 7. Keputusan produk (SCOPE REDUCTION) — locked

| Keputusan | Ringkas |
|-----------|---------|
| Mode | Seminimal ke **satu tenant hidup** |
| Approach | Funnel **DAFTAR** di chat (bukan hanya form admin) |
| Approve | Satu klik di CMS; SLA bisnis ≤24 jam |
| Bukti sukses | Manual E2E: `cek stok` setelah Approve (**B4**) |
| Out of scope v1 | OTP, bayar, multi-HP/toko, admin WA ping pending, wizard AI penuh |

Rollback bisnis: ops dapat mematikan funnel daftar → nomor asing lagi diam; toko yang sudah di-approve tetap kasir. Cara teknis: [hermes-local.md](../../system/hermes-local.md).

---

## 8. Jalur trial (checklist operasional)

```mermaid
flowchart LR
  D[Deploy] --> V[Verify]
  V --> S[Smoke]
  S --> R[WA: DAFTAR→YA]
  R --> A[CMS Approve 1x]
  A --> W[STATUS / tunggu sebentar]
  W --> C[cek stok]
```

1. Deploy + verify + smoke (lihat skrip di [system](../../system/hermes-local.md)).
2. WA nyata (nomor belum allowlist): `halo` → `DAFTAR` → nama toko → `YA`.
3. CMS `/admin/ai-studio/umkm` → **Menunggu approve** → Approve sekali.
4. Ketik `STATUS` (harus “Toko aktif…”) lalu `cek stok`.
5. Sukses = **B4**.

### Kriteria lulus

| # | Kriteria |
|---|----------|
| 1 | Nomor asing dapat balasan menyebut DAFTAR (bukan diam) |
| 2 | YA → muncul di CMS Menunggu approve |
| 3 | Approve → toko aktif; registration approved |
| 4 | `cek stok` dijawab kasir (bukan intro DAFTAR) — **B4** |
| 5 | Pending dijanjikan **≤24 jam** (B3); 1 phone = 1 toko (B6) |

---

## 9. Riwayat

| Tanggal | Catatan |
|---------|---------|
| 2026-09-12 | Design parent IMPLEMENTED (code) |
| 2026-09-19 | SCOPE REDUCTION; aturan B1–B7 dikunci |
| 2026-09-19 | Dipindah ke `docs/aistudio/umkm-wa/business/` (pisah business vs system) |
