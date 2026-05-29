# AI Studio — Database context (Supabase views)

Chat dapat menjawab pertanyaan operasional/penjualan dengan menyuntikkan baris read-only dari **view** yang di-allowlist di `studio_notebooks.context_config`.

## Setup (sekali)

1. Schema e-commerce + seed dasar:
   ```bash
   psql ... -f supabase/ecommerce_schema.sql
   psql ... -f supabase/ecommerce_seed.sql
   ```
2. View + katalog metadata Studio:
   ```bash
   psql ... -f middleware/sql/studio_sales_views.sql
   ```
3. Seed order “hari ini” (opsional, idempotent):
   ```bash
   psql ... -f supabase/studio_sales_seed.sql
   ```

Pada Docker Postgres lokal, gunakan user `supabase_admin` (lihat `STUDIO_GUIDED_CHAT.md`).

## View yang tersedia

| View | Untuk pertanyaan seperti |
|------|---------------------------|
| `v_studio_sales_today` | Penjualan hari ini, omzet hari ini |
| `v_studio_sales_summary` | Total penjualan, omzet keseluruhan |
| `v_studio_top_products` | Produk paling laris / best seller |
| `v_studio_recent_orders` | Status pesanan, order terbaru |

Metadata contoh pertanyaan ada di tabel `studio_data_catalog`.

## `context_config` notebook

Default saat membuat notebook baru (middleware):

```json
{
  "supabase_views": [
    "v_studio_sales_today",
    "v_studio_sales_summary",
    "v_studio_top_products",
    "v_studio_recent_orders"
  ]
}
```

Notebook lama: update manual di DB atau buat notebook baru.

## Uji chat

- "Berapa penjualan hari ini?"
- "Berapa total penjualan keseluruhan?"
- "Produk apa yang paling laris?"
- "Status pesanan ORD-TODAY-001"

Pastikan middleware memakai `service_role` Supabase agar view terbaca.
