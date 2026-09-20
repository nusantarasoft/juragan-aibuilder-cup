# Studio RAG — architecture & ops notes

Audience: eng / ops.  
Product UI: `/admin/ai-studio` (notebook Sources → Chat).  
Code: `middleware` Nest — `StudioIngestionService`, `RagService.embedText`, `StudioContextService.retrieveContext` / `semanticSearchNotebook`, `match_studio_chunks`.

Diagrams: [`diagrams/aistudio/studio/system/`](../../../../diagrams/aistudio/studio/system/).

## Mental model

```text
Upload PDF/URL  →  extract  →  chunk  →  embed  →  studio_source_chunks
User / WA ask   →  embed(query)  →  vector match  →  top chunks  →  LLM synthesize
```

- **Notebook** = container sumber + chat. Bisa milik user/tenant di Admin Studio.
- **Chunks + embeddings** = fakta yang bisa di-retrieve. Tanpa status sumber `done`, RAG kosong.
- **LLM chat** = hanya menyusun jawaban dari cuplikan (+ instruksi). Bukan yang “mengisi” index.

## Embed vs LLM (best practice)

| Layer | Harus stabil? | Catatan |
|-------|---------------|---------|
| **Embedding model** (ingest + query) | **Ya — satu pipeline per index** | Query harus pakai model **yang sama** (atau kompatibel) dengan saat chunk di-embed. Ganti model embed → **reindex semua** sumber. |
| **LLM generator** (chat / report / `kasir_consult` synthesize) | **Boleh diganti** | Independen dari ruang vektor. Kalau jawaban jelek setelah ganti LLM, biasanya prompt / kepatuhan “hanya dari cuplikan” — **bukan** wajib LLM = vendor embedding. |

### Kenapa sering terasa “Gemini embed + LLM lain = salah”

Biasanya **bukan** karena ruang embedding “hanya cocok Gemini chat”, melainkan:

1. Model baru mengabaikan instruksi / mengarang di luar chunk  
2. Prompt system beda  
3. Retrieve sebenarnya lemah (top_k / threshold / chunk jelek) — dievaluasi salah sebagai “LLM salah”  
4. Campur eval: hit retrieve OK, generate jelek

**Praktik:** eval terpisah — (A) chunk relevan? (B) jawaban setia ke chunk?  
Kunci embed di Settings/gateway; ganti chat model bebas. Jangan campur dua model embed dalam satu tabel notebook tanpa reindex.

## Dua konsumen RAG di produk ini

| Konsumen | Notebook | Scope |
|----------|----------|--------|
| **Studio Chat** (Admin) | Notebook yang dibuka user | Biasanya dokumen proyek / tenant itu |
| **WA `kasir_consult`** | Env `KASIR_CONSULT_NOTEBOOK_ID` (satu notebook kurikulum bersama) | Shared PDF UKM — **bukan** ledger jual/stok; default `KASIR_CONSULT=0`; sitasi `hlm` hanya jika `KASIR_CONSULT_CITE_PAGES=1` (default `0`); optional `KASIR_CONSULT_INJECT_METRICS` (synthesize only) |

Ledger stok/omzet **tidak** lewat RAG — lihat [L8](../../../../diagrams/aistudio/umkm-wa/system/L8-knowledge-soul.svg) + [hermes-architecture](../../umkm-wa/system/hermes-architecture.md).

Per-tenant SOP RAG untuk WA = deferred (`TODOS.md`).

## Ingest (sekali per sumber)

1. Upload / import ke notebook  
2. Pipeline: extract → chunk (~1200 char, overlap ~150) → `embedText` → simpan vektor  
3. UI status: `pending` → `parsing` → **`done`** (atau `error`)  
4. Reindex setelah ganti **embedding provider/model**

Detail UC: [studio README](../README.md) (UC-19…UC-22).

## Ask path (setiap pertanyaan)

1. Embed pertanyaan (model yang sama dengan index)  
2. `match_studio_chunks` (threshold + `match_count` / top_k)  
3. Susun `fileContext` dari chunk hit  
4. LLM synthesize **hanya** dari konteks (+ aturan prompt)  
5. 0 chunk → jawaban canned / miss copy (jangan free LLM untuk fakta dokumen)

WA consult: Hermes → `POST /internal/kasir-consult` → `consultFromNotebook` (top_k 5, reply ≤800). Plan: [`docs/designs/ceo-plan-wa-consult-kurikulum-rag.md`](../../designs/ceo-plan-wa-consult-kurikulum-rag.md).

## Ops checklist (kurikulum WA)

1. Notebook khusus kurikulum + PDF sah ter-ingest (`done`) — **prod:** 376 chunks, notebook `48aee243-…`  
2. `KASIR_CONSULT_NOTEBOOK_ID` di **middleware**  
3. `KASIR_CONSULT_KEY` sama di Hermes + middleware  
4. Soft GA: `KASIR_CONSULT=1` di **keduanya**; smoke `hermes-consult-smoke.py`  
5. Matikan ke `0` hanya jika ops memutuskan pause (compose default tetap `0` untuk lingkungan baru)

Embed: **`google_ai`** + `gemini-embedding-001` (768-d). Jangan pakai OpenRouter untuk index ini tanpa reindex + keputusan model.

## Failure modes

| Gejala | Cek dulu |
|--------|----------|
| “Belum ketemu di buku” / empty chat | Sumber belum `done`; notebook id salah; query di luar isi PDF |
| Jawaban ngarang angka toko | Salah path — harus tools DB, bukan RAG; atau prompt bocor |
| Setelah ganti LLM jelek | Prompt / model; cek apakah retrieve masih hit chunk yang sama |
| Setelah ganti embed jelek | Reindex wajib; jangan campur vektor lama |

## Related

- Diagrams: [system README](../../../../diagrams/aistudio/studio/system/README.md)  
- UMKM WA knowledge locks: [L8](../../../../diagrams/aistudio/umkm-wa/system/L8-knowledge-soul.svg) · consult hop [L9](../../../../diagrams/aistudio/umkm-wa/system/L9-kasir-consult.svg) · ops [consult-kurikulum.md](../../umkm-wa/business/ops/consult-kurikulum.md)  
- Studio use cases: [../README.md](../README.md)
