# AI Studio UMKM — Catat Penjualan & Laporan via WhatsApp

> **Alur & diagram flow:** lihat [STUDIO_UMKM_FLOW.md](./STUDIO_UMKM_FLOW.md) (alur bisnis, guide flow, sesi WA, sub-alur catat/laporan).
>
> Acuan metodologi: **AIDLC** (AI Development Life Cycle) — pipeline UMKM: pahami pesan → routing intent (`handleMessage`) → preview konfirmasi → commit → evaluasi.

Modul ini mengubah AI Studio menjadi **asisten penjualan UMKM** lewat WhatsApp:

1. **Catat penjualan** — pesan natural → preview → konfirmasi `ya` → `ecom_orders` + `ecom_order_items`
2. **Cek stok** — baca `inv_stock_ledger` (available / on hand)
3. **Laporan penjualan** — ringkasan harian dari view `v_studio_sales_*`

## Arsitektur (AIDLC-aligned)

```
UMKM (WhatsApp)
    → WAHA webhook
    → StudioWhatsAppService
        ├─ umkm_mode=true  → StudioUmkmService.handleMessage()  ← produk UMKM
        │     ├─ greeting → welcome cheat-sheet
        │     ├─ help → bantuan
        │     ├─ pendamping / saran bisnis / pendamping bisnis → PendampingService (string, never null)
        │     ├─ ask / tanya /1 → null → Agentic Ask (di router)
        │     ├─ mixed job → await_job_clarification (bukan tebak)
        │                  ├─ cousin-sale (`ada yang beli` / `tadi beli`) → record_sale
        │     ├─ omzet / stok / daftar / belanja jelas → matcher (bukan stamp)
        │     ├─ jual/stok/laporan → handler / slot wizard
        │     └─ unknown → bantuan (string, tidak pernah RAG)
        ├─ else use_guided_flow=true  → Guide Flow (notebook generik / AI Gateway)
        └─ else → StudioService.chat() RAG
        ├─ else use_guided_flow=true  → GuideFlow (notebook generik / AI Gateway)
        └─ else → StudioService.chat() RAG
    → staging percakapan (pending sale) → konfirmasi
    → ecom_orders (WRITE) / inv_stock_ledger (READ) / v_studio_sales_* (READ)
    → balasan WhatsApp
```

Intent internal ↔ label AIDLC:

| Internal | AIDLC |
|----------|-------|
| `record_sale` | `catat_transaksi` |
| `check_stock` | `cek_stok` |
| `sales_report` | `laporan` |
| `list_products` / `help` | `tanya_umum` |
| `unknown` | `lainnya` |

### File utama

| File | Peran |
|------|-------|
| `studio-umkm.util.ts` | Intent, matcher intake (D4.1 + cousin-sale), parsing rupiah, format WA |
| `studio-umkm.service.ts` | Preview/commit sale, stok, laporan, setup notebook |
| `guide-flow.definition.ts` | `defaultUmkmGuideFlowDefinition()` + node `action` |
| `guide-flow.service.ts` | Eksekusi `record_sale`, `confirm_sale`, `check_stock`, … |
| `studio-whatsapp.service.ts` | Routing UMKM saat `umkm_mode` |

Matcher `kind: sale` (`ada yang beli` / `tadi beli`) memaksa catat penjualan. Matcher juga **punya job jelas** omzet / cek stok / daftar / belanja (frasa DEFAULT + ekstra sepupu seperti `barang apa aja`, `etalase`, `sisa [barang]`, `masih ada berapa`) — stamp notebook tidak bisa menyembunyikannya. Keyword stamp tetap **union** ke DEFAULT sebagai alias tambahan. Help/ask tetap dijalankan sebelum matcher. Bare `yang beli` bukan cousin-sale. `berapa yang beli …` adalah **laporan** (`sales_report`), bukan jual dan bukan help. Mixed `beli` tetap klarifikasi.

Preview jual/belanja di WhatsApp live mencoba tombol native, lalu **list** GOWS/NOWEB (**Ya, simpan** / **Batal**). Tap `umkm_ya`/`umkm_batal` dipetakan ke `ya`/`batal`. Ketik tetap jalan. Kalau WAHA menolak keduanya, bot jatuh ke teks.

## Setup aplikasi (step by step)

### Prasyarat

- Docker: Postgres, WAHA, middleware
- Tabel e-commerce: `supabase/ecommerce_schema.sql`
- View penjualan: `middleware/sql/studio_sales_views.sql`
- Tabel WhatsApp: `middleware/sql/studio_whatsapp.sql`
- `ANTHROPIC_API_KEY` (opsional — fallback parsing rule-based jika kosong)

### 1. Environment

Root `.env` / `middleware/.env`:

```env
# Database (sesuaikan dengan docker compose Anda)
DATABASE_URL=postgresql://supabase_admin:...@localhost:5432/nusantarasoft

# WhatsApp / WAHA
WAHA_API_KEY=your-api-key
WAHA_SESSION=default
WAHA_WEBHOOK_HMAC_KEY=your-webhook-secret

# AI (opsional, untuk parsing pesan kompleks)
ANTHROPIC_API_KEY=sk-ant-...

# Keamanan WA production
STUDIO_WHATSAPP_REQUIRE_ALLOWLIST=true
STUDIO_WHATSAPP_RATE_LIMIT_PER_MINUTE=10
```

### 2. Database

PowerShell (dari root repo):

```powershell
Get-Content .\supabase\ecommerce_schema.sql -Raw | docker exec -i postgres psql -U supabase_admin -d nusantarasoft -v ON_ERROR_STOP=1
Get-Content .\middleware\sql\studio_sales_views.sql -Raw | docker exec -i postgres psql -U supabase_admin -d nusantarasoft -v ON_ERROR_STOP=1
Get-Content .\middleware\sql\studio_whatsapp.sql -Raw | docker exec -i postgres psql -U supabase_admin -d nusantarasoft -v ON_ERROR_STOP=1

# Opsional: data demo untuk uji laporan
Get-Content .\supabase\studio_sales_seed.sql -Raw | docker exec -i postgres psql -U supabase_admin -d nusantarasoft -v ON_ERROR_STOP=1
```

### 3. Jalankan layanan

```powershell
docker compose up -d postgres waha
cd middleware
npm install
npm run start:dev
```

Admin (opsional):

```powershell
cd admin
npm install
npm run dev
```

### 4. Pair WhatsApp (WAHA)

1. Buka http://localhost:3010/dashboard
2. Start session `default` → scan QR
3. Pastikan status **WORKING**
4. Set webhook ke middleware (lihat [STUDIO_WHATSAPP.md](./STUDIO_WHATSAPP.md))

### 5. Buat notebook UMKM

**Opsi A — GraphQL (disarankan)**

Di GraphQL Playground (`http://localhost:4001/graphql`):

```graphql
# 1. Buat notebook
mutation {
  createStudioNotebook(
    name: "Toko Saya"
    description: "UMKM penjualan WA"
    userId: "YOUR_USER_UUID"
    audience: "customer"
  )
}

# 2. Aktifkan mode UMKM (jangan publish Guide Flow)
mutation {
  studioSetupUmkmNotebook(
    notebookId: "NOTEBOOK_UUID"
    publishGuideFlow: false
  )
}

# 3. Konfigurasi WhatsApp
mutation {
  updateStudioWhatsAppConfig(
    notebookId: "NOTEBOOK_UUID"
    enabled: true
    allowlistPhones: ["6281234567890"]
    useGuidedFlow: false
  )
}
```

**Opsi B — SQL manual**

Lihat `middleware/sql/studio_umkm_setup.sql`.

### 6. Uji di WhatsApp

Kirim ke nomor bisnis yang ter-pair. Menu default (`DEFAULT_UMKM_COMMANDS`):

| Pesan | Hasil yang diharapkan |
|-------|-----------------------|
| `halo` / `0` / `bantuan` | Welcome cheat-sheet + menu 0–6 |
| `1` / `tanya` | Agentic Ask (bukan RAG dokumen saja) |
| `2` | Hub Menu (daftar / tambah menu / tambah stok) |
| `3` | Hub Belanja |
| `4` | Daftar penjualan |
| `5` / `jual 3 es kopi 45000` | Mulai jual / preview konfirmasi (belum ke DB) |
| `ya` (saat ada preview) | Order tersimpan + nomor `WA-...` |
| `batal` (saat ada preview) | Draft dibatalkan |
| `cek stok kopi` | Qty available dari ledger |
| `6` / `laporan hari ini` | Ringkasan omzet |
| `berapa penjualan hari ini` | Sama (laporan) |

**Cutover:** setelah deploy, digit sisa dari menu Guide Flow lama **bukan** no-op. `3` membuka **Belanja**, bukan “daftar barang”. Reset Sim / ketik `0` sebelum pesan pertama.

### Menu angka (DEFAULT_UMKM_COMMANDS)

Balas **satu digit**:

| Angka | Aksi |
|-------|------|
| `1` | Tanya (Agentic Ask) |
| `2` | Hub Menu |
| `3` | Hub Belanja |
| `4` | Daftar penjualan |
| `5` | Tambah penjualan |
| `6` | Hub Laporan |
| `0` | Bantuan |

Saat ada preview penjualan: `ya` / `ok` = konfirmasi, `batal` = batalkan.

## Menu WhatsApp (default baru)

| Angka | Aksi |
|-------|------|
| `1` | Tanya (**Agentic RAG** — baca data toko + dokumen) |
| `2` | Hub Menu → daftar / tambah menu / tambah stok |
| `3` | Hub Belanja → daftar / bulan ini / tambah belanja |
| `4` | Daftar penjualan |
| `5` | Tambah penjualan |
| `6` | Hub Laporan → hari / minggu / bulan / semua (penjualan + belanja) |
| `0` | Bantuan |

Belanja tersimpan di `studio_umkm_purchases` (+ item) dan menambah stok katalog bila nama match.

## Perintah yang bisa dikonfigurasi (`umkm_commands`)

Kata kunci, angka menu, dan ya/batal **bukan hardcoded tetap** — disimpan per notebook di `studio_notebooks.context_config.umkm_commands`.

Edit di **Admin → AI Studio → UMKM → Edit** (section *Perintah WhatsApp*), atau GraphQL:

```graphql
mutation {
  updateStudioUmkmCommands(
    notebookId: "..."
    commands: {
      menu: [
        { digit: "1", intent: "record_sale", label: "Catat penjualan" }
        { digit: "2", intent: "check_stock", label: "Cek stok" }
      ]
      keywords: {
        record_sale: ["jual", "catat"]
        sales_report: ["laporan", "omzet"]
        check_stock: ["cek stok", "stok"]
        list_products: ["daftar barang"]
        help: ["bantuan", "menu"]
      }
      confirm: ["ya", "ok", "1"]
      cancel: ["batal", "0"]
    }
    republishGuideFlow: false
  )
}
```

- Stamp `keywords` di notebook **digabung** dengan default (tambah alias, tidak menimpa). Array kosong tidak menghapus frasa default. `menu` / `confirm` / `cancel` tetap replace jika diisi.
- **Tambah** alias di array keyword notebook; menghapus frasa default tidak bisa lewat stamp kosong — ganti lewat default kode atau alias tambahan.
- Intent aksi tetap: `record_sale` | `check_stock` | `list_products` | `sales_report` | `help`.
- Saat simpan, **jangan** `republishGuideFlow: true` di produksi UMKM — inbound memakai `handleMessage()`, bukan graph XState.
- Setup UMKM men-seed default jika `umkm_commands` belum ada (tidak menimpa custom).
- Query default: `studioUmkmCommandsDefaults`.

Default menu/keyword = tabel di atas (1–5, jual/laporan/…).

## Katalog produk (`inv_items`)

Saat catat penjualan, nama barang **dicocokkan** ke `inv_items` (status `active`, `tenant_id` sama):

- Cocok → `ecom_order_items.item_id` terisi, nama/SKU dari katalog
- Tidak cocok → tetap bisa dikonfirmasi dengan label _(belum di katalog)_ (mode default)

Opsional di `context_config`:

```json
{ "umkm_require_catalog_match": true }
```

Jika `true` dan ada katalog, penjualan **ditolak** bila nama tidak match.

Perintah WA: `daftar barang`, `daftar produk`, `katalog`.

## Cek stok (`inv_stock_ledger`)

`cek stok [nama]` menjumlahkan `available` (= on_hand − reserved − committed) per item.

## Format pesan penjualan

Parser mendukung (rule-based + LLM fallback):

```
jual 3 es kopi 45000
catat 2 tas total 500rb tunai
order pelanggan Budi 1 sabun 25000 transfer
jualan 5 kopi susu @ 15000
```

Setelah parse berhasil, bot mengirim **preview**. Commit ke DB hanya setelah pengguna membalas `ya` / `benar` / `ok` / `1` (staging di konteks percakapan / memory chat, TTL 15 menit). Batalkan dengan `batal` / `0`.

Field yang diekstrak:

- Item, qty, harga
- Total (eksplisit atau dihitung)
- Pelanggan (opsional)
- Pembayaran: tunai, transfer, qris → otomatis `payment_status=paid`

Data disimpan ke `ecom_orders` dengan `source=api`, `status=completed`.

## Guide flow UMKM

Flow bawaan: **UMKM Penjualan WA** (`defaultUmkmGuideFlowDefinition(commands)`).

Produk UMKM **tidak** memakai flow ini. Graph tetap ada untuk notebook generik / hatch GraphQL `publishGuideFlow: true` (bukan path admin UMKM).

Welcome + transisi `listen_intent` digenerate dari `context_config.umkm_commands` saat `createAndPublishUmkmFlow`.

Node `action`:

| Action | Perilaku |
|--------|----------|
| `record_sale` | Parse + match katalog → **preview** (pending) |
| `confirm_sale` | Commit pending → INSERT order |
| `cancel_sale` | Hapus draft pending |
| `check_stock` | Query `inv_stock_ledger` |
| `sales_report` | Query views + template WA |
| `list_products` | Daftar barang dari `inv_items` |
| `umkm_help` | Tampilkan menu bantuan |

Jangan aktifkan dengan `useGuidedFlow: true` untuk notebook `umkm_mode`. Produk UMKM adalah `handleMessage()` (router umkm-first). Guide Flow tetap untuk notebook generik di AI Gateway.

> Notebook yang sudah publish flow lama **UMKM Penjualan WA** dibiarkan (orphan). Routing `umkm_mode` membuatnya tidak terpanggil. Mode `umkm_mode` tanpa guided flow mendukung konfirmasi via pending sale per nomor.

## Mode operasi

| `umkm_mode` | `use_guided_flow` | Perilaku |
|-------------|-------------------|----------|
| `true` | * | UMKM branch (`handleMessage()`); null hanya ask → Agentic Ask; unknown = bantuan |
| `false` | `true` | Guide Flow (notebook generik / AI Gateway) |
| `false` | `false` | Chat RAG |

`umkm_mode` diset lewat `studio_notebooks.context_config`:

```json
{
  "umkm_mode": true,
  "tenant_id": "default",
  "audience": "customer",
  "supabase_views": [
    "v_studio_sales_today",
    "v_studio_sales_summary",
    "v_studio_top_products",
    "v_studio_recent_orders"
  ]
}
```

## Keamanan

- **Allowlist nomor** wajib di production (`STUDIO_WHATSAPP_REQUIRE_ALLOWLIST=true`)
- Hanya nomor terdaftar boleh catat penjualan
- Rate limit default 10 pesan/menit per nomor
- Lihat [STUDIO_WHATSAPP.md](./STUDIO_WHATSAPP.md)

## Testing

```powershell
cd middleware
npm test
```

Unit test: `studio-umkm.util.spec.ts` (intent, parsing, guide flow graph).

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| "belum bisa memahami penjualan" | Gunakan format contoh; set `ANTHROPIC_API_KEY` |
| Preview muncul tapi order tidak tersimpan | Balas `ya` dalam 15 menit |
| Laporan selalu 0 | Pastikan `studio_sales_views.sql` terpasang; catat + konfirmasi dulu |
| WA tidak membalas | Cek allowlist, WAHA status WORKING, notebook_id di config |
| Order tidak muncul di laporan | View filter `tenant_id=default`; sesuaikan `context_config.tenant_id` |
| Stok selalu 0 | Isi `inv_stock_ledger` untuk `item_id` terkait |

## Fase 2 (sudah)

- Query Understanding AIDLC (`studio-umkm-qu.ts`) untuk pesan ambigu → intent + klarifikasi
- Staging durable `studio_umkm_pending_sales`
- `tanya_umum` → node `do_ask` memakai **Agentic Ask** (tool terbatas: stok, penjualan, belanja, laporan, katalog, dokumen, arahkan menu) — bukan RAG dokumen saja
- Modul: `studio-umkm-agentic-ask.*` (planner murni + orchestrator). Aksi tulis (jual/tambah) **tidak** dieksekusi dari Tanya; diarahkan ke menu + konfirmasi.

## Fase 3 (sudah)

- **Feedback logging** — ketik `nilai 1–5` / `4/5` / `puas` / `kurang` → tabel `studio_umkm_feedback` (angka polos `1–5` = menu CS, bukan rating)
- **Potong stok otomatis** — `SALE_OUT` via `InventoryService` saat commit (item match katalog)
- **Laporan harian cron** — `StudioUmkmCronService` pukul 13:00 UTC (~20:00 WIB); matikan dengan `STUDIO_UMKM_DAILY_REPORT_ENABLED=false`
- **WhatsApp via WAHA** — inbound webhook + outbound `sendText` (tidak memakai Meta Cloud API)

```env
STUDIO_UMKM_DAILY_REPORT_ENABLED=true
```

```powershell
Get-Content .\middleware\sql\studio_umkm_pending_sales.sql -Raw | docker exec -i postgres psql -U supabase_admin -d nusantarasoft -v ON_ERROR_STOP=1
Get-Content .\middleware\sql\studio_umkm_feedback.sql -Raw | docker exec -i postgres psql -U supabase_admin -d nusantarasoft -v ON_ERROR_STOP=1
```

## Referensi

- [STUDIO_WHATSAPP.md](./STUDIO_WHATSAPP.md) — WAHA & webhook
- [STUDIO_DB_CONTEXT.md](./STUDIO_DB_CONTEXT.md) — view penjualan untuk chat
- [STUDIO_GUIDED_CHAT.md](./STUDIO_GUIDED_CHAT.md) — guide flow umum
