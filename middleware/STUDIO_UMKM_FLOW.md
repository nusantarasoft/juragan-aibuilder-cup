# AI Studio UMKM — Dokumen Alur & Flow

Dokumen ini menjelaskan **alur bisnis** (UMKM), **alur setup** (admin), dan **alur teknis** (sistem) untuk fitur catat penjualan & laporan via WhatsApp.

Dokumen terkait:
- [STUDIO_UMKM.md](./STUDIO_UMKM.md) — setup & konfigurasi
- [STUDIO_WHATSAPP.md](./STUDIO_WHATSAPP.md) — WAHA & webhook
- [STUDIO_GUIDED_CHAT.md](./STUDIO_GUIDED_CHAT.md) — guide flow umum

---

## 1. Ringkasan aktor

| Aktor | Peran |
|-------|-------|
| **UMKM** | Pemilik/staff toko; pakai WhatsApp sehari-hari |
| **Admin** | Setup sekali: notebook, WA, allowlist |
| **WAHA** | Jembatan WhatsApp Web ↔ HTTP API |
| **Middleware** | NestJS: webhook, guide flow, parsing, DB |
| **Postgres** | `ecom_orders` (tulis), `v_studio_sales_*` (baca) |

---

## 2. Alur bisnis (sudut pandang UMKM)

```mermaid
flowchart TD
    U[UMKM buka WhatsApp]
    U --> M1[Kirim pesan ke nomor bisnis]
    M1 --> W{Jenis pesan?}

    W -->|1 / jual / catat / order| R[Preview penjualan]
    W -->|2 / cek stok| S[Lihat stok ledger]
    W -->|3 / daftar barang| K[Katalog produk]
    W -->|4 / laporan / rekap / omzet| L[Lihat laporan hari ini]
    W -->|5 / 0 / bantuan / menu| H[Terima panduan format]
    W -->|bye| X[Penutup]

    R --> P{User: ya/1 atau batal/0?}
    P -->|ya / 1| RC[Commit: nomor order + total]
    P -->|batal / 0| CX[Draft dibatalkan]
    L --> LR[Ringkasan: order, omzet, produk terlaris]

    H --> M1
    S --> M1
    K --> M1
    RC --> M1
    CX --> M1
    LR --> M1
```

### Contoh percakapan

```
UMKM  → 5
Bot   → Menu angka 1–5 + contoh format

UMKM  → 1
Bot   → Prompt: kirim detail jual ...

UMKM  → jual 3 es kopi 45000 tunai
Bot   → 📋 Konfirmasi penjualan … Ketik ya / 1 atau batal / 0

UMKM  → 1
Bot   → ✅ Penjualan tercatat! No. order WA-... Total Rp 45.000

UMKM  → 2
Bot   → 📦 Stok tersedia …

UMKM  → 4
Bot   → 📊 Order hari ini: 1, Omzet: Rp 45.000, ...
```

---

## 3. Alur setup (admin, sekali)

```mermaid
flowchart LR
    A1[DB: ecom + sales views + wa config]
    A2[Pair WAHA QR]
    A3[Buat / pilih notebook]
    A4[studioSetupUmkmNotebook]
    A5[Config WhatsApp: notebook + allowlist + guided flow]
    A6[Uji dari HP]

    A1 --> A2 --> A3 --> A4 --> A5 --> A6
```

| Step | Apa yang terjadi | Output |
|------|------------------|--------|
| 1 | Jalankan SQL schema & view | Tabel `ecom_orders`, view `v_studio_sales_today` |
| 2 | Pair WAHA | Session `WORKING`, nomor bisnis aktif |
| 3 | Notebook AI Studio | UUID notebook |
| 4 | `studioSetupUmkmNotebook` | `umkm_mode: true` + flow **UMKM Penjualan WA** published |
| 5 | `updateStudioWhatsAppConfig` | `enabled`, `allowlist_phones`, `use_guided_flow: true` |
| 6 | Kirim `bantuan` dari HP | Welcome UMKM + menu |

---

## 4. Alur teknis — pesan masuk (inbound)

```mermaid
sequenceDiagram
    participant U as UMKM (HP)
    participant WA as WhatsApp
    participant WH as WAHA
    participant MW as StudioWhatsAppService
    participant GF as GuideFlowService
    participant UK as StudioUmkmService
    participant DB as Postgres

    U->>WA: kirim pesan
    WA->>WH: event message
    WH->>MW: POST /api/studio/whatsapp/webhook

    MW->>MW: cek enabled + notebook_id
    MW->>MW: cek allowlist + rate limit
    MW->>DB: resolveSession(chat_id → conversation_id)

    alt use_guided_flow = true
        MW->>GF: runGuidedTurn()
        GF->>GF: cek guide_flow_id vs published flow
        alt flow mismatch / belum bound
            GF->>GF: startGuidedSession (welcome)
        end
        GF->>UK: action node (record_sale / sales_report / umkm_help)
        UK->>DB: INSERT order atau SELECT views
        UK-->>GF: teks balasan
    else umkm_mode tanpa guided flow
        MW->>UK: handleMessage() intent routing
        UK->>DB: WRITE atau READ
    else mode generik
        MW->>MW: StudioService.chat() RAG
    end

    MW->>WH: sendText (chunk ≤4000)
    WH->>WA: balasan
    WA->>U: terima pesan
```

### Routing keputusan di webhook

```
handleWebhook()
  ├─ config.enabled && notebook_id?  → lanjut / else stop
  ├─ allowlist + rate limit
  ├─ resolveSession(chat_id)
  └─ routing jawaban:
       ├─ use_guided_flow=true     → runGuidedTurn()      ← disarankan UMKM
       ├─ umkm_mode && !guided     → StudioUmkmService
       └─ lainnya                  → StudioService.chat()
```

---

## 5. Guide flow — UMKM Penjualan WA

Definisi: `defaultUmkmGuideFlowDefinition()` di `guide-flow.definition.ts`  
Nama published: **UMKM Penjualan WA** (AIDLC: preview → ya/batal → commit)

### Diagram state

```mermaid
stateDiagram-v2
    [*] --> start
    start --> welcome: auto
    welcome --> listen_intent: pesan sambutan

    listen_intent --> help: keyword bantuan/help/menu atau 0/5/9
    listen_intent --> do_confirm: ya / 1 (saat ada pending)
    listen_intent --> do_cancel: batal / 0 (saat ada pending)
    listen_intent --> do_list: 3 / daftar/katalog
    listen_intent --> do_stock: 2 / cek stok
    listen_intent --> do_report: 4 / keyword laporan/rekap/omzet
    listen_intent --> do_record: 1 / regex jual/catat/order
    listen_intent --> do_ask: default / tanya_umum
    listen_intent --> goodbye: keyword bye

    help --> listen_intent: action umkm_help
    do_record --> listen_intent: action record_sale (preview)
    do_confirm --> listen_intent: action confirm_sale
    do_cancel --> listen_intent: action cancel_sale
    do_stock --> listen_intent: action check_stock
    do_list --> listen_intent: action list_products
    do_report --> listen_intent: action sales_report
    do_ask --> listen_intent: rag tanya_umum

    goodbye --> end: auto
    end --> [*]
```

### Node `listen_intent` — prioritas cabang

| Urutan | Kondisi | Target |
|--------|---------|--------|
| 1 | mengandung `bye` | `goodbye` |
| 2 | `bantuan`, `help`, `menu` | `help` |
| 3 | `ya` / `benar` / `ok` (ada pending) | `do_confirm` |
| 4 | `batal` / `tidak` (ada pending) | `do_cancel` |
| 5 | `daftar` / `katalog` / list produk | `do_list` |
| 6 | `cek stok` / `stok` | `do_stock` |
| 7 | `laporan`, `rekap`, `omzet` | `do_report` |
| 8 | regex `jual`, `jualan`, `catat`, `order`, `transaksi` | `do_record` |
| 9 | **default** / `tanya_umum` (via QU) | `do_ask` (RAG) |

> **Catatan:** Pesan bebas masuk `do_ask` (RAG). Query Understanding AIDLC dipakai bila jalur default/ambigu untuk remap intent atau minta klarifikasi. Commit hanya setelah `ya`.

### Node `action` — eksekusi

| Node | Action | Service | Output |
|------|--------|---------|--------|
| `do_record` | `record_sale` | `prepareSaleFromText()` | Preview (pending) |
| `do_confirm` | `confirm_sale` | `commitPendingSale()` | Order tersimpan |
| `do_cancel` | `cancel_sale` | hapus pending | Draft dibatalkan |
| `do_stock` | `check_stock` | `buildStockCheckMessage()` | Qty stok |
| `do_list` | `list_products` | `buildProductListMessage()` | Katalog |
| `do_report` | `sales_report` | `buildDailyReportMessage()` | Template laporan WA |
| `help` | `umkm_help` | `formatUmkmHelp()` | Menu contoh |

---

## 6. Sub-alur — catat penjualan (WRITE)

```mermaid
flowchart TD
    T[Teks pesan WA] --> I{detectUmkmIntent}
    I -->|record_sale| P[parseSaleMessage]

    P --> H[parseSaleHeuristic rule-based]
    H -->|berhasil| S[ParsedUmkmSale]
    H -->|gagal| L[parseSaleWithLlm]
    L -->|berhasil| S
    L -->|gagal| E[Pesan error + contoh format]

    S --> M[Match katalog inv_items]
    M --> PV[formatSalePreview → pending]
    PV --> CF{ya / batal?}
    CF -->|ya| W[saveSale]
    CF -->|batal| X[Hapus draft]
    W --> O[INSERT ecom_orders]
    W --> I2[INSERT ecom_order_items per baris]
    O --> C[formatSaleConfirmation → balasan WA]

    style PV fill:#fff8e1
    style O fill:#e8f5e9
    style I2 fill:#e8f5e9
```

### Field yang disimpan

| Tabel | Field penting |
|-------|---------------|
| `ecom_orders` | `order_number` (WA-YYYYMMDD-...), `total_amount`, `payment_status`, `source=api`, `status=completed` |
| `ecom_order_items` | `item_name`, `quantity`, `unit_price`, `subtotal` |

### Aturan pembayaran

- Pesan mengandung `tunai`, `transfer`, `qris`, dll. → `payment_status=paid`, `paid_amount=total`
- Tanpa kata pembayaran → `payment_status=unpaid`

### Format pesan yang didukung

```
jual 3 es kopi 45000
catat 2 tas total 500rb tunai
order pelanggan Budi 1 sabun 25000 transfer
```

Staging: pending di `guide_flow_context` (guided) atau memory per `tenant:phone` (TTL 15 menit).

---

## 7. Sub-alur — laporan penjualan (READ)

```mermaid
flowchart TD
    T[Teks: laporan / rekap / omzet] --> F[fetchDailyReport]
    F --> V1[v_studio_sales_today]
    F --> V2[v_studio_top_products LIMIT 5]
    F --> V3[v_studio_recent_orders LIMIT 5]
    V1 --> FM[formatDailyReportWa]
    V2 --> FM
    V3 --> FM
    FM --> R[Balasan WhatsApp ringkas]
```

### Isi laporan

- Tanggal
- Jumlah order hari ini & yang lunas
- Omzet kotor & terbayar
- Produk terlaris (top 5, all-time dari view)
- Order terbaru (3 baris)

---

## 8. Alur sesi WhatsApp

Setiap `chat_id` WA dipetakan ke satu baris di `studio_whatsapp_sessions` → `studio_conversations`.

```mermaid
flowchart TD
    IN[Pesan masuk dari chat_id] --> EX{Ada session?}
    EX -->|tidak| NC[Buat studio_conversations baru]
    EX -->|ya| EC[Pakai conversation_id existing]
    NC --> GF
    EC --> GF

    GF{use_guided_flow?}
    GF -->|ya| CK{guide_flow_id = published flow?}
    CK -->|tidak / ended| RS[Restart: startGuidedSession + update session]
    CK -->|ya| TURN[guidedChatTurn]
    RS --> TURN
```

### Reset sesi otomatis

Sesi di-restart (welcome ulang) jika:

1. `guide_flow_id` kosong (percakapan baru)
2. **Flow published berubah** (mis. dari "New guide flow" → "UMKM Penjualan WA")
3. Flow sudah `end` (`guide_flow_node_id` null)

Ini mencegah error: *"Conversation is not bound to this guide flow"*.

---

## 9. Model data (ringkas)

```mermaid
erDiagram
    studio_whatsapp_config ||--o| studio_notebooks : notebook_id
    studio_whatsapp_sessions ||--|| studio_conversations : conversation_id
    studio_conversations ||--o| studio_guide_flows : guide_flow_id
    studio_notebooks ||--o{ studio_guide_flows : notebook_id
    ecom_orders ||--|{ ecom_order_items : order_id

    studio_whatsapp_config {
        text tenant_id
        uuid notebook_id
        bool enabled
        text[] allowlist_phones
        bool use_guided_flow
    }

    studio_notebooks {
        uuid id
        jsonb context_config
        text audience
    }

    ecom_orders {
        uuid id
        text order_number
        numeric total_amount
        text payment_status
        text source
    }
```

### `context_config` notebook UMKM

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

---

## 10. Mode operasi

| `umkm_mode` | `use_guided_flow` | Perilaku |
|-------------|-------------------|----------|
| `true` | `true` | **Disarankan** — welcome + routing listen + action nodes |
| `true` | `false` | Intent langsung (`handleMessage`), tanpa welcome otomatis |
| `false` | `true` | Guide flow generik (RAG), bukan UMKM |
| `false` | `false` | Chat RAG bebas |

---

## 11. Keamanan dalam alur

```mermaid
flowchart LR
    M[Pesan masuk] --> A{Allowlist required?}
    A -->|production| B{Nomor di allowlist?}
    A -->|dev kosong| C[Lanjut]
    B -->|ya| C
    B -->|tidak| STOP[Drop silently]
    C --> R{Rate limit OK?}
    R -->|ya| PROC[Proses]
    R -->|tidak| RL[Pesan: tunggu sebentar]
```

- Production / `STUDIO_WHATSAPP_REQUIRE_ALLOWLIST=true` → allowlist wajib
- Default: 10 pesan/menit per nomor

---

## 12. File kode per tahap alur

| Tahap alur | File |
|------------|------|
| Webhook masuk | `studio-whatsapp.controller.ts` → `studio-whatsapp.service.ts` |
| Sesi & routing | `studio-whatsapp.service.ts` (`handleWebhook`, `runGuidedTurn`) |
| Guide flow runtime | `guide-flow.service.ts` (`runFlowDrain`, case `action`) |
| Definisi flow UMKM | `guide-flow.definition.ts` (`defaultUmkmGuideFlowDefinition`) |
| Intent & parsing | `studio-umkm.util.ts` |
| Simpan order & laporan | `studio-umkm.service.ts` |
| View penjualan | `middleware/sql/studio_sales_views.sql` |
| Setup notebook | `studio.resolver.ts` → `studioSetupUmkmNotebook` |

---

## 13. Troubleshooting alur

| Gejala | Titik alur yang gagal | Solusi |
|--------|----------------------|--------|
| Tidak ada balasan | Webhook / WAHA tidak WORKING | Cek dashboard WAHA, webhook URL |
| Drop tanpa balasan | Allowlist | Tambah nomor atau kosongkan di dev |
| Welcome lama (RAG) | Guide flow bukan UMKM | `studioSetupUmkmNotebook` + publish |
| Error "not bound to guide flow" | Sesi lama + flow baru | Kirim pesan lagi (auto-restart) atau hapus session |
| "belum bisa memahami penjualan" | Parsing `record_sale` | Gunakan format contoh; set `ANTHROPIC_API_KEY` |
| Laporan 0 | Belum ada order hari ini | Catat penjualan dulu |

---

## 14. Diagram end-to-end (satu gambar)

```mermaid
flowchart TB
    subgraph Setup["Setup (sekali)"]
        S1[SQL + WAHA pair]
        S2[studioSetupUmkmNotebook]
        S3[updateStudioWhatsAppConfig]
        S1 --> S2 --> S3
    end

    subgraph Runtime["Runtime (sehari-hari)"]
        U[UMKM WhatsApp]
        W[Webhook]
        G[Guide Flow UMKM]
        A1[record_sale → ecom_orders]
        A2[sales_report → views]
        U --> W --> G
        G --> A1
        G --> A2
        A1 --> U
        A2 --> U
    end

    Setup --> Runtime
```
