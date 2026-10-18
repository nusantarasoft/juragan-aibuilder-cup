# Riset Knowledge UMKM (AI Studio)

Pipeline **human-in-the-loop** untuk memperbarui notebook kurikulum WA (`KASIR_CONSULT_NOTEBOOK_ID`) dari sumber regulasi pemerintah — tanpa merge otomatis.

## Alur

Diagram: [L5-riset-knowledge.svg](../../../diagrams/aistudio/studio/system/L5-riset-knowledge.svg)

1. **Cron mingguan** (default off) atau tombol admin **Jalankan riset sekarang** menjalankan batch fetch + ringkasan LLM.
2. Setiap URL seed di-allowlist (domain `.go.id` resmi + `jdih.*.go.id`), dengan guard SSRF yang sama seperti `importUrl`.
3. LLM (`studio_settings` default provider) menghasilkan ringkasan; setiap klaim wajib punya `quoted_snippet` yang divalidasi sebagai substring teks fetch.
4. Embedding ringkasan dibandingkan ke chunk notebook (`match_studio_chunks`) → flag **mirip/duplikat** atau **mungkin bertentangan** (tidak auto-drop).
5. Super admin membuka **AI Studio → Riset Knowledge**, review, edit ringkasan, lalu **Approve (merge)** atau **Tolak**.
6. Merge membuat sumber teks via `addTextSource` + provenance header (URL, kutipan, id riset, reviewer) → `ingestSource`.
7. **Unmerge** menghapus source (chunk cascade) dan mengembalikan status ke `approved`.
8. Item `pending` > 30 hari → status `expired` (cron harian).

## Enable (ops)

| Env (middleware) | Default | Keterangan |
|------------------|---------|------------|
| `KASIR_CONSULT_NOTEBOOK_ID` | — | **Wajib** — UUID notebook kurikulum target merge |
| `STUDIO_RESEARCH_CRON_ENABLED` | `false` | `true` untuk cron mingguan (Sen 03:00 UTC) |
| `STUDIO_RESEARCH_PENDING_EXPIRE_DAYS` | `30` | Auto-expire pending |
| `STUDIO_RESEARCH_DUPLICATE_THRESHOLD` | `0.88` | Skor similarity → mirip/duplikat |
| `STUDIO_RESEARCH_CONFLICT_THRESHOLD` | `0.78` | Skor similarity → mungkin bertentangan |

Migrasi DB: `supabase/migrations/20261018120000_studio_research_items.sql` (`studio_research_runs`, `studio_research_items`).

## Topik seed (kode)

Daftar awal di `middleware/src/studio/studio-research-topics.ts` (pajak PP 55, NIB/OSS, halal, KUR, QRIS/BI, pembukuan). Dapat diperluas later tanpa mengubah kontrak tabel.

## Akses

GraphQL + halaman admin **super_admin** saja (sama pola dengan Percakapan WA).

## Deferred / batasan MVP

- Tidak ada API pencarian eksternal (Exa/Tavily); hanya URL seed + fetch HTTP/PDF.
- Edit kutipan per-source di UI belum — perbaikan via edit summary + re-run jika validasi gagal.
- `supersedes_url` dan multi-notebook per kategori belum di-expose di UI (kolom DB siap).
