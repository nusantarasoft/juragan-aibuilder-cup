# volumes/db

| Path | Fungsi |
|------|--------|
| `data/` | Volume Postgres persisten (jangan commit) |
| `*.sql` | **Sumber legacy** — salinan untuk referensi; kanonik ada di `supabase/migrations/` |

Docker compose mem-mount `supabase/migrations/` saja. Setelah mengubah schema, update file bernomor di `supabase/migrations/` (bisa copy dari sini jika masih menjadi sumber edit).
