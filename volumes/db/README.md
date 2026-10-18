# volumes/db

| Path | Fungsi |
|------|--------|
| `data/` | Volume Postgres persisten (jangan commit) |

Seluruh file migrasi dan schema SQL berada di `supabase/migrations/` (serta `supabase/modules/` dan `supabase/archive/`). Docker compose mem-mount `./supabase/migrations` ke `/docker-entrypoint-initdb.d/migrations:ro`.
