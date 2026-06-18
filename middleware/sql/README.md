# middleware/sql — legacy & ad-hoc SQL

**Jangan apply file di folder ini langsung** ke DB produksi/lokal kecuali sedang men-debug.

Schema Studio dan modul utama sudah dikonsolidasi ke:

```
supabase/migrations/
```

## Studio — sudah dimigrasi

| File lama | Migrasi kanonik |
|-----------|-----------------|
| `studio_sales_views.sql` | `00000000000080_studio_sales_views.sql` |
| `studio_cs_views.sql` | `00000000000081_studio_cs_views.sql` |
| `studio_whatsapp*.sql` | `00000000000082`–`84` |
| `studio_notebooks_audience_migration.sql` | `00000000000085` |
| `studio_notebooks_sales_context_migration.sql` | `00000000000086` |
| `studio_source_ingest_stage.sql` | `00000000000087` |
| `studio_umkm_setup.sql` | `00000000000088` |
| `fix_match_studio_chunks_filename.sql` | `00000000000089` |
| `studio_remove_ragflow_columns.sql` | `00000000000090` |
| `studio_notebooks.sql`, `studio_guide_flows.sql`, `studio_source_chunks.sql` | Sudah ada di `00000000000061_studio_tables.sql` |

## Belum dimigrasi (modul terpisah)

- `inventory_schema.sql`, `procurement_schema.sql`, `wms_*.sql`
- `acct_phase*.sql`, `pm_pmbok7_8_schema.sql`
- Seed: `seed_*.sql`, `procurement_seed.sql`, `acct_dummy_data.sql`

Lihat `supabase/manifest.modules.txt` untuk apply opsional.

## Alternatif embedding

`studio_embedding_google_ai_768.sql` — 768-dim Google AI. Ini sekarang sudah dikonsolidasi ke kanonik `supabase/migrations/00000000000062_studio_embedding_google_ai_768.sql` (standar golden path). Dokumentasi: `supabase/README.md`.
