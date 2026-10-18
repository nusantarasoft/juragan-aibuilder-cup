# Konten Marketing UMKM (AI Studio)

Pipeline **human-in-the-loop** untuk membuat kartu promo produk warung dari katalog `inv_items`, lalu menampilkannya di **galeri web publik** (frontend terpisah). **Tidak ada** publish Instagram/Meta di scope ini.

**Foto produk:** pakai upload inventory jika ada; jika tidak, **generate foto produk AI** (Gemini image API key atau Vertex Imagen) — default **`STUDIO_MARKETING_AI_PRODUCT_IMAGE=true`**. Nama/harga/teks di kartu tetap dari DB (Sharp), bukan AI.

## Alur

Diagram: [L5-konten-marketing.svg](../../../diagrams/aistudio/studio/system/L5-konten-marketing.svg)

1. Super admin mengaktifkan **consent marketing** per warung (`studio_whatsapp_config.marketing_consent`).
2. **Generate sekarang** (GraphQL) atau **cron mingguan** (opsional) memilih produk eligible: consent=true, status active (foto inventory **opsional** jika AI product image aktif).
3. **Foto di kartu:** foto asli `media_ids[0]` **atau** AI product image (Gemini Nano Banana / Flash image via API key — fallback `gemini-nano-banana-2.1`, `gemini-3.1-flash-image`; ops override `STUDIO_MARKETING_GEMINI_IMAGE_MODEL`; tanpa key → Vertex Imagen 3).
4. **Sharp** meng-composite foto + teks truthy dari DB (nama, harga Rp, nama warung) — teks **bukan** hasil AI.
5. Opsional: background abstrak via Gemini/Imagen jika `STUDIO_MARKETING_AI_BACKGROUND=true` (fallback ke gradient template).
6. **Caption** Bahasa Indonesia via LLM default `studio_settings`; error provider = gagal (tidak ada caption sampah).
7. Gambar disimpan MinIO (`cms-media`) dengan URL publik via proxy middleware.
8. Admin **AI Studio → Konten Marketing**: review, edit caption, approve / reject / unpublish.
9. Hanya `status=approved` + consent warung=true muncul di API galeri publik **dan** di **brochure-gallery** (showcase Adityo, port `:3014` prod) — kartu UMKM ditampilkan di atas brosur tenant seed.

Migrasi DB: `supabase/migrations/20261018150000_studio_marketing_contents.sql`.

## Enable

### Nginx (prod / dev)

Middleware mendengarkan `/public/marketing/*` **internal** (port 4001). Dari internet, path harus lewat **nginx** (prefix `^~ /public/marketing/` → `middleware_api`), ditempatkan **sebelum** `location /` landing agar tidak tertimpa.

**URL publik prod (domain):** [`https://nusantarasoft.com/public/marketing/gallery`](https://nusantarasoft.com/public/marketing/gallery)

| Endpoint | URL publik |
|----------|------------|
| Galeri JSON | `GET https://nusantarasoft.com/public/marketing/gallery` |
| Satu item | `GET https://nusantarasoft.com/public/marketing/gallery/:id` |
| PNG asset | `GET https://nusantarasoft.com/public/marketing/assets/:id` |

Traffik HTTPS ke domain biasanya diteruskan ke stack nginx internal (compose: host `:8090`; lihat `SITE_URL` di `.env.master-production`). Location `^~ /public/marketing/` di `nginx.master-production.conf` mem-proxy ke middleware.

Setelah deploy: `docker exec nsoft3-nginx nginx -t` lalu restart nginx jika config berubah.

### Env (middleware)

| Env (middleware) | Default | Keterangan |
|------------------|---------|------------|
| `STUDIO_MARKETING_CRON_ENABLED` | `false` | `true` → cron Sen 04:00 UTC, max ~20 item |
| `STUDIO_MARKETING_AI_PRODUCT_IMAGE` | `true` | `false` → wajib foto inventory (`media_ids[0]`) |
| `STUDIO_MARKETING_AI_BACKGROUND` | `false` | `true` → coba Gemini/Imagen background (fallback template) |
| `STUDIO_MARKETING_PUBLIC_BASE_URL` | fallback `SITE_URL` | **Prod:** set eksplisit `https://nusantarasoft.com` agar `image_public_url` / `imageUrl` di JSON galeri match domain publik. Compose: `${STUDIO_MARKETING_PUBLIC_BASE_URL:-${SITE_URL:-}}`. |
| `SITE_URL` | — | Fallback (mis. `http://31.97.66.39:8090` = nginx langsung) jika override marketing kosong |
| `STUDIO_MARKETING_PUBLIC_RATE_MAX` | `120` | Rate limit GET publik per IP per window |
| `STUDIO_MARKETING_PUBLIC_RATE_WINDOW_MS` | `60000` | Window rate limit (ms) |
| `CORS_ORIGINS` | — | Tambahkan origin landing galeri Adityo (comma-separated) |

Jika tidak ada base URL (dev lokal tanpa `SITE_URL`), `image_public_url` / `imageUrl` di API galeri memakai path relatif `/public/marketing/assets/<id>` (cocok untuk frontend same-origin di nginx).

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

## Showcase publik (brochure-gallery)

Setelah approve, konten masuk feed showcase **`brochure-gallery`** (bukan hanya JSON mentah):

| Prod | URL |
|------|-----|
| Grid / 3D showcase | `http://31.97.66.39:3014` |
| Permalink kartu UMKM | `/b/m-{contentId}` (prefix `m-` = Konten Marketing) |

Server showcase memanggil middleware `GET /public/marketing/gallery` (env `MARKETING_GALLERY_BASE_URL`, default `http://middleware:4001/public/marketing` di Docker) lalu merge dengan `tenant_brochures`.

## API publik (middleware — dipakai showcase)

Base path: `/public/marketing` (no auth, read-only). **Prod:** panggil via `https://nusantarasoft.com/...` (nginx → middleware), bukan port middleware internal `:4001`.

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
      "imageUrl": "https://nusantarasoft.com/public/marketing/assets/550e8400-e29b-41d4-a716-446655440000",
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
