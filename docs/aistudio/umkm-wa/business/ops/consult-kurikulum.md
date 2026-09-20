# Ops — konsultasi kurikulum WA (`KASIR_CONSULT`)

Internal runbook. Pitch sales: [../pitch.md](../pitch.md). Teknis: [../../system/hermes-architecture.md](../../system/hermes-architecture.md) · Studio RAG: [../../../studio/system/rag-architecture.md](../../../studio/system/rag-architecture.md).

## Status prod (2026-09-20)

| Item | Nilai |
|------|--------|
| Soft GA | **`KASIR_CONSULT=1`** di Hermes **dan** middleware |
| Notebook | `48aee243-9086-40d7-84ee-0c115d3de902` (*Kurikulum UKM*) |
| Ingest | PDF *Manajemen Usaha Kecil dan Menengah* — **376** chunk `done` (`google_ai` / `gemini-embedding-001`) |
| Prefix owner | `tanya` / `konsultasi` / `pendamping` |
| Sitasi | **`KASIR_CONSULT_CITE_PAGES=0`** default — set `1` untuk `(…, hlm. N)` dari marker `-- N of M --` |
| Metrics inject | **`KASIR_CONSULT_INJECT_METRICS=0`** default — set `1` hanya jika ingin cuplikan laporan hari ini di synthesize (label *dari kasir*, L8) |

Compose/example default tetap `0` — prod di-set ON lewat `.env.master-production`. Matikan keduanya bersama jika perlu.

## Saklar

```bash
# Soft GA ON (keduanya) lalu recreate middleware + hermes + posture
# Soft GA OFF: KASIR_CONSULT=0 di Hermes DAN middleware, lalu recreate keduanya

# Polish (tetap default OFF di prod):
# KASIR_CONSULT_CITE_PAGES=1   → sitasi hlm (recreate middleware)
# KASIR_CONSULT_INJECT_METRICS=1 → cuplikan laporan di synthesize (recreate middleware)
```

Setelah recreate Hermes: `hermes-kasir-posture.py apply --docker`.

Smoke:

```bash
python3 scripts/master-production/hermes-consult-smoke.py off
python3 scripts/master-production/hermes-consult-smoke.py on
# di container:
docker exec -e HERMES_HOME=/opt/data nsoft3-hermes \
  python3 /opt/data/consult-smoke.py on --plugin-root /opt/data/plugins/kasir-tools
```

## QA singkat (allowlisted WA)

| Kirim | Harap |
|-------|--------|
| `tanya jenis modal UKM` | Jawaban grounded buku (bukan stok); sitasi `hlm` hanya jika `KASIR_CONSULT_CITE_PAGES=1` |
| `cek stok indomie` | Angka ledger tools |
| Topik luar (mis. harga Bitcoin) | Refuse scope — jangan mengarang harga |
| `tanya cek stok …` | Redirect copy — tidak retrieve buku |

## Jangan

- Jangan RAG-kan tabel jual/stok (`inv_stock_ledger` dll).
- Kalau user `tanya cek stok …` lewat consult: Hermes + Nest **redirect** ke *cek stok* / *jual* / *laporan* (status `consult_ledger_redirect`) — tidak retrieve notebook.
- Jangan ganti embedding model tanpa **reindex** seluruh sumber notebook.
- Jangan janjikan multi-PDF / SOP per toko di v1 (lihat `TODOS.md`).

## Diagram

- Bisnis: [L0d](../../../../../diagrams/aistudio/umkm-wa/business/L0d-tanya-kurikulum.svg)
- Sistem: [L8](../../../../../diagrams/aistudio/umkm-wa/system/L8-knowledge-soul.svg) · [L9](../../../../../diagrams/aistudio/umkm-wa/system/L9-kasir-consult.svg)
