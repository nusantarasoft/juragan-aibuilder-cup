# Konten Marketing UMKM (AI Studio)

Pipeline **human-in-the-loop** untuk membuat kartu promo produk warung dari katalog `inv_items` + foto asli, lalu menampilkannya di **galeri web publik** (frontend terpisah). **Tidak ada** publish Instagram/Meta di scope ini.

## Alur

Diagram: [L5-konten-marketing.svg](../../../diagrams/aistudio/studio/system/L5-konten-marketing.svg)

1. Super admin mengaktifkan **consent marketing** per warung (`studio_whatsapp_config.marketing_consent`).
2. **Generate sekarang** (GraphQL) atau **cron mingguan** (opsional) memilih produk eligible: consent=true, status active, punya foto (`media_ids[0]`).
3. **Sharp** meng-composite foto produk + teks truthy dari DB (nama, harga Rp, nama warung) — teks **bukan** hasil AI.
4. Opsional: background abstrak via Gemini/Imagen jika `STUDIO_MARKETING_AI_BACKGROUND=true` (fallback ke gradient template).
5. **Caption** Bahasa Indonesia via LLM default `studio_settings`; error provider = gagal (tidak ada caption sampah).
6. Gambar disimpan MinIO (`cms-media`) dengan URL publik via proxy middleware.
7. Admin **AI Studio → Konten Marketing**: review, edit caption, approve / reject / unpublish.
8. Hanya `status=approved` + consent warung=true muncul di API galeri publik.

Migrasi DB: `supabase/migrations/20261018150000_studio_marketing_contents.sql`.

## Enable

| Env (middleware) | Default | Keterangan |
|------------------|---------|------------|
| `STUDIO_MARKETING_CRON_ENABLED` | `false` | `true` → cron Sen 04:00 UTC, max ~20 item |
| `STUDIO_MARKETING_AI_BACKGROUND` | `false` | `true` → coba Gemini/Imagen background (fallback template) |
| `STUDIO_MARKETING_PUBLIC_BASE_URL` | — | Base URL untuk `image_public_url` (mis. `https://api.example.com`) |
| `STUDIO_MARKETING_PUBLIC_RATE_MAX` | `120` | Rate limit GET publik per IP per window |
| `STUDIO_MARKETING_PUBLIC_RATE_WINDOW_MS` | `60000` | Window rate limit (ms) |
| `CORS_ORIGINS` | — | Tambahkan origin landing galeri Adityo (comma-separated) |

Provider LLM/image: kredensial **AI Studio → Settings** (`google_api_key`, `google_service_account_json`, `google_project_id`, dll.).

## GraphQL (super_admin)

| Operasi | Nama |
|---------|------|
| Query list | `studioMarketingContents(status, tenantId)` |
| Query detail | `studioMarketingContent(id)` |
| Query consent | `studioMarketingStores` |
| Mutasi generate | `studioMarketingGenerate(store, productId, limit)` |
| Mutasi review | `studioMarketingApprove`, `studioMarketingReject`, `studioMarketingUnpublish` |
| Mutasi caption | `studioMarketingUpdateCaption(id, caption, headline)` |
| Mutasi consent | `studioMarketingSetStoreConsent(tenantId, consent)` |

## API publik (Adityo — galeri frontend)

Base path middleware: `/public/marketing` (no auth, read-only).

### `GET /public/marketing/gallery`

Query params:

| Param | Tipe | Keterangan |
|-------|------|------------|
| `store` | string | Filter `tenant_id` warung |
| `category` | string | Filter nama kategori (ilike) |
| `page` | number | Default 1 |
| `limit` | number | Default 24, max 60 |

Response contoh:

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "imageUrl": "https://api.nusantarasoft.com/public/marketing/assets/550e8400-e29b-41d4-a716-446655440000",
      "caption": "Es teh segar Bu Siti — Rp 5.000. Mampir ke warung ya!",
      "headline": "Es Teh Segar",
      "productName": "Es Teh Manis",
      "price": "Rp 5.000",
      "storeLabel": "Warung Bu Siti",
      "category": "Minuman",
      "publishedAt": "2026-10-18T04:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 24,
  "total": 1
}
```

### `GET /public/marketing/gallery/:id`

Mengembalikan satu objek item (shape sama seperti elemen `items` di atas).

### `GET /public/marketing/assets/:id`

Binary PNG (hanya konten **approved** + warung consent). `Cache-Control: public, max-age=86400`.

**PII:** API tidak mengembalikan nomor telepon; hanya label warung publik.

## Deferred

- Notifikasi WA ke pemilik saat konten live.
- Recruit SKU `umkm-marketing` / channel tenant-owned.
- Redis rate limit multi-replica.
- Diagram ladder L5 dedicated (opsional follow-up).
