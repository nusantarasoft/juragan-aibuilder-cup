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
| Synthesize LLM | Nest **`KASIR_CONSULT_SYNTH_PROVIDER=openrouter`** + **`qwen/qwen3.7-flash`** (bukan Hermes Flash). Key: `OPENROUTER_API_KEY`. Lihat [model-stack.md](../../system/model-stack.md) · [L10](../../../../../diagrams/aistudio/umkm-wa/system/L10-model-stack.svg) |
| Hermes HTTP timeout | **`KASIR_CONSULT_TIMEOUT_SEC=60`** (default). Nest+Qwen sering 15–35s; timeout 30s → copy “sibuk” palsu |

Compose/example default tetap `0` — prod di-set ON lewat `.env.master-production`. Matikan keduanya bersama jika perlu.

## Saklar

```bash
# Soft GA ON (keduanya) lalu recreate middleware + hermes + posture
# Soft GA OFF: KASIR_CONSULT=0 di Hermes DAN middleware, lalu recreate keduanya

# Synthesize model (middleware only; default Qwen3.7 Flash on OpenRouter):
# KASIR_CONSULT_SYNTH_PROVIDER=openrouter
# KASIR_CONSULT_SYNTH_MODEL=qwen/qwen3.7-flash
# OPENROUTER_API_KEY=…   # same key Hermes may use
# KASIR_CONSULT_TIMEOUT_SEC=60  # Hermes HTTP wait for Nest (default 60)

# Polish (tetap default OFF di prod):
# KASIR_CONSULT_CITE_PAGES=1   → sitasi hlm (recreate middleware)
# KASIR_CONSULT_INJECT_METRICS=1 → cuplikan laporan di synthesize (recreate middleware)
```

Setelah recreate Hermes: `hermes-kasir-posture.py apply --docker`.

## Observability (Agentic OS)

Setiap hop `POST /internal/kasir-consult` (consult / coach / off) menulis task **`kasir_wa`** per tenant ke **`aos_tasks`** (queued → running → done/failed). Kolom `source` memakai nilai **`kasir_wa`** (migration `20261015133000_aos_tasks_kasir_wa_source.sql`). Ringkasan **tanpa** nomor WA atau isi pesan. Gagal persist queue **hanya log** — balasan WA tetap sukses. VO Live menampilkan task Kasir bila ada di roster AOS.

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
- Sistem: [L8](../../../../../diagrams/aistudio/umkm-wa/system/L8-knowledge-soul.svg) · [L9](../../../../../diagrams/aistudio/umkm-wa/system/L9-kasir-consult.svg) · [L10 model stack](../../../../../diagrams/aistudio/umkm-wa/system/L10-model-stack.svg)
- Model lock: [model-stack.md](../../system/model-stack.md)
