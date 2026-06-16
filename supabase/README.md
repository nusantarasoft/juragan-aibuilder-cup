# Supabase Database Setup

## Golden path (satu sumber migrasi)

Semua SQL schema + seed ada di **`supabase/migrations/`**, dijalankan **berurutan menurut nama file**.

| Skenario | Perintah |
|----------|----------|
| DB baru (fresh) | `docker compose down -v` lalu `docker compose up -d postgres` |
| DB sudah jalan | `.\scripts\apply-migrations.ps1` lalu opsional `.\scripts\apply-migrations.ps1 -Manifest seeds` |
| Cek tanpa apply | `.\scripts\apply-migrations.ps1 -DryRun` |

Docker (`docker-compose.yml`, `docker-compose.local.yml`, `docker-compose.full.yml`) mem-mount **hanya** `./supabase/migrations` ke `/docker-entrypoint-initdb.d/migrations`.

Folder `volumes/db/*.sql` dan `middleware/sql/studio_*.sql` adalah **salinan sumber** — jangan apply manual; ubah file di `supabase/migrations/` lalu sync dari sumber jika perlu.

## Urutan migrasi (prefix)

| Prefix | Isi |
|--------|-----|
| `00000000000001` | Tabel `schema_migrations` (tracking untuk `apply-migrations.ps1`) |
| `00000000000010`–`54` | Platform Supabase (extensions, roles, realtime, pooler, …) |
| `00000000000060` | `consolidated_init` — schema app utama (~144 tabel) |
| `00000000000061`–`90` | Studio RAG, modul app, studio extensions |
| `20260506*` | Ops & notifications |
| `99900001*` | Seed data (hanya di akhir) |

`studio_outputs` ada di `00000000000062_studio_outputs.sql` (setelah `studio_notebooks` di `61`).

## Manifest

- `manifest.core.txt` — schema (tanpa seed)
- `manifest.seeds.txt` — seed `999*`
- `manifest.modules.txt` — modul opsional / legacy (inventory, procurement, archive)

## Reset DB lokal

```powershell
docker compose down -v
docker compose up -d postgres
```

Volume data: `volumes/db/data/`. Init scripts hanya jalan sekali saat volume kosong.

## Embedding dimension

Default `match_studio_chunks` memakai **1408 dim** (`00000000000061_studio_tables.sql`).  
`middleware/sql/studio_embedding_google_ai_768.sql` adalah alternatif 768-dim — **jangan** apply bersamaan; pilih satu strategi embedding.

## Manual psql

```powershell
Get-Content supabase\migrations\00000000000062_studio_outputs.sql -Raw |
  docker exec -i postgres psql -U supabase_admin -d nusantarasoft -v ON_ERROR_STOP=1
```
