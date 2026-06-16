# AI Studio — Studio: Panduan Testing

Suite test untuk halaman **Studio** (`/admin/ai-studio`) dan modul backend `middleware/src/studio`.

## Ringkasan layer

| Layer | Tool | Lokasi | Perintah |
|-------|------|--------|----------|
| **Unit (middleware)** | Vitest | `middleware/src/studio/*.spec.ts` | `npm run test:studio` |
| **Unit (admin)** | Vitest | `admin/src/app/admin/ai-studio/*.spec.ts` | `npm run test:studio` |
| **Integration (GraphQL)** | Vitest + fetch | `studio.graphql.integration.spec.ts` | `npm run test:studio:integration` |
| **Integration (RAG eval)** | Vitest + notebook live | `studio-rag-eval.integration.spec.ts` | `npm run test:rag-eval` |
| **E2E** | Playwright | `admin/tests/e2e/ai-studio.spec.ts` | `npm run test:e2e:studio` |

## Prasyarat

- **Unit**: tidak butuh server (jalan offline).
- **Integration GraphQL**: middleware harus jalan di `http://127.0.0.1:4001/graphql`.
- **RAG eval**: notebook terindeks + env `STUDIO_RAG_EVAL_NOTEBOOK_ID`.
- **E2E**: admin di port **3003** + kredensial admin valid.

## Middleware

```bash
cd middleware

# Semua unit test studio
npm run test:studio

# Semua test (termasuk studio)
npm test

# Integration GraphQL (middleware harus running)
npm run test:studio:integration

# RAG eval live (opsional)
set RUN_RAG_EVAL=1
set STUDIO_RAG_EVAL_NOTEBOOK_ID=<uuid-notebook>
npm run test:rag-eval
```

### Env integration

| Variabel | Default | Keterangan |
|----------|---------|------------|
| `RUN_STUDIO_INTEGRATION` | — | Set `1` untuk GraphQL integration |
| `STUDIO_GRAPHQL_URL` | `http://127.0.0.1:4001/graphql` | URL GraphQL |
| `RUN_RAG_EVAL` | — | Set `1` untuk RAG eval live |
| `STUDIO_RAG_EVAL_NOTEBOOK_ID` | — | UUID notebook uji |
| `STUDIO_RAG_EVAL_MIN_HIT_RATE` | `0` | Ambang hit@k (0–1) |

## Admin

```bash
cd admin

# Unit test AI Studio
npm run test:studio

# Semua unit test admin
npm test

# E2E AI Studio (admin dev server di 3003)
npm run test:e2e:studio
```

### Env E2E

| Variabel | Default |
|----------|---------|
| `E2E_ADMIN_EMAIL` | `admin@nusantarasoft.com` |
| `E2E_ADMIN_PASSWORD` | `admin123` |

## Cakupan use case

| UC | Area test |
|----|-----------|
| UC-05–09 | `studioSourceStatus.spec.ts` |
| UC-10–13, UC-26–27 | `ai-studio.unit.spec.ts`, E2E `ai-studio.spec.ts` |
| UC-15–17, UC-23–25 | `guide-flow.*.spec.ts`, GraphQL integration |
| UC-18–18b | GraphQL `studioPlaygroundTest`, E2E Playground tab |
| UC-19–22 | `studio-chunk.util.spec.ts`, RAG eval integration |

## Menambah test baru

1. **Pure function** → unit spec di folder yang sama dengan sumber.
2. **GraphQL API** → tambah case di `studio.graphql.integration.spec.ts` (skip jika `RUN_STUDIO_INTEGRATION` tidak set).
3. **UI flow** → Playwright di `admin/tests/e2e/ai-studio.spec.ts`.

Jalankan `npm run test:studio` di middleware dan admin sebelum PR yang menyentuh Studio.
