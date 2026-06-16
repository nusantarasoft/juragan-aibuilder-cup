# Supabase Database Setup

## Overview

Semua migrasi SQL terpusat di **`supabase/migrations/`**. Folder migrasi lain (`database/migrations`, `volumes/db/migrations`, `admin/supabase/migrations`, dll.) sudah dihapus.

## Directory Structure

```
supabase/
├── migrations/                          # Satu-satunya folder migrasi
│   ├── 00000000000000_consolidated_init.sql   # Schema lengkap (~144 tabel)
│   ├── 00000000000001_schema_migrations.sql   # Tabel tracking migrasi
│   ├── 20260506000001_ops_module.sql
│   ├── 20260506000002_notifications_module.sql
│   ├── 20260506000003_data_export_logs.sql
│   ├── 20260506000004_realtime_notifications.sql
│   ├── 20260506999999_reload_postgrest.sql
│   ├── 00000001000000_seed_data.sql           # Seed demo utama
│   └── 00000001000001_seed_ops_notifications.sql
├── manifest.core.txt                    # Urutan apply ke DB existing
├── manifest.modules.txt                 # Modul opsional
├── archive/                             # SQL lama (referensi)
└── README.md
```

## Setup DB Baru (Docker)

```bash
docker compose up -d postgres
```

Postgres container mem-mount file dari `supabase/migrations/` (lihat `docker-compose.yml`).

## Apply ke DB yang Sudah Jalan

```powershell
.\scripts\apply-migrations.ps1              # core manifest
.\scripts\apply-migrations.ps1 -Manifest modules
.\scripts\apply-migrations.ps1 -DryRun
```

Manifest ada di `supabase/manifest.core.txt` dan `supabase/manifest.modules.txt`.

## Manual (psql)

```bash
docker exec -i postgres psql -U postgres -d nusantarasoft \
  -f supabase/migrations/00000000000000_consolidated_init.sql
```

## Render PlantUML

```bash
plantuml docs/aistudio/studio/use-case-diagram.puml
```
