# AI Studio — Menu Studio

Use case diagram untuk halaman **Studio** (`/admin/ai-studio`) di modul AI Studio Admin CMS.

Hub AI Studio (semua modul): [../README.md](../README.md)

## File

| File | Deskripsi |
|------|-----------|
| [use-case-diagram.svg](./use-case-diagram.svg) | Diagram use case (SVG, siap dibuka di browser) |
| [use-case-diagram.puml](./use-case-diagram.puml) | Sumber PlantUML untuk diedit / diekspor ulang |
| [TESTING.md](./TESTING.md) | Panduan unit, integration, dan E2E test Studio |
| [system/rag-architecture.md](./system/rag-architecture.md) | RAG: ingest / retrieve / embed vs LLM / konsumen WA |
| [riset-knowledge-umkm.md](./riset-knowledge-umkm.md) | Riset Knowledge: cron/review/merge ke kurikulum WA |
| Diagrams RAG | [diagrams/aistudio/studio/system/](../../../diagrams/aistudio/studio/system/) L1–L4 |

## Aktor

| Aktor | Peran |
|-------|--------|
| **Pengguna Admin** | Pengguna CMS terautentikasi yang mengelola notebook, sumber, chat, dan guide flow |
| **Middleware** | Backend NestJS: `StudioIngestionService`, RAG, guide flow, generate report |

## Ringkasan use case (Admin)

Layout utama **NotebookLM**: **Sources (kiri) | Chat (tengah) | Studio (kanan)**. Playground dan Guide flows ada di submenu **Advanced**.

| ID | Use case | Area |
|----|----------|------|
| UC-01 | Lihat daftar notebook | Header dropdown |
| UC-02 | Buat notebook | Header / modal |
| UC-03 | Pilih notebook | Dropdown header |
| UC-04 | Hapus notebook | Header |
| UC-37 | Update notebook (nama, deskripsi, instruksi chat) | `updateStudioNotebook` |
| UC-05 | Tambah sumber dari Media Library | Panel Sources (kiri) |
| UC-06 | Upload file ke notebook | Panel Sources |
| UC-07 | Hapus sumber | Panel Sources |
| UC-08 | Reindex sumber | Panel Sources |
| UC-09 | Monitor status indeksasi | Panel Sources (polling + progress) |
| UC-29 | Filter sumber untuk chat (checkbox → `sourceIds`) | Panel Sources |
| UC-30 | Configure chat (`chat_instruction`) | Modal Sources |
| UC-33 | Import URL sebagai sumber | Panel Sources → `importStudioUrl` |
| UC-10 | Chat RAG (tanya jawab bebas) | Panel Chat → `studioChat` |
| UC-11 | Chat guided flow | Panel Chat → `studioGuidedChat` |
| UC-12 | Mulai chat baru | Panel Chat |
| UC-13 | Lihat referensi sumber jawaban (skor relevansi) | Panel Chat |
| UC-26 | Lanjutkan riwayat percakapan | Panel Chat → `studioConversation` |
| UC-27 | Pilih mode chat (bebas / guided) | Panel Chat (Segmented) |
| UC-31 | Auto notebook brief setelah indeksasi | Panel Chat → `studioGenerateBrief` |
| UC-32 | Preview chunk kutipan | Drawer → `studioChunk` |
| UC-36 | Layout 3-kolom NotebookLM | Halaman Studio |
| UC-14 | Generate executive report | Panel Studio → `studioGenerateOutput` / report |
| UC-34 | Generate artefak (mind map, quiz, FAQ, audio script, …) | Panel Studio → `studioGenerateOutput` |
| UC-35 | Kelola library output (list / hapus) | Panel Studio → `studioOutputs` |
| UC-15 | Kelola guide flow (buat / edit / hapus) | Advanced → Guide flows |
| UC-16 | Publish guide flow | Advanced → Guide flows |
| UC-17 | Simulasi guide flow | Advanced → Guide flows |
| UC-23 | Validasi graph flow (Zod + XState coverage) | Advanced → `studioValidateGuideFlow` |
| UC-24 | Buat flow dari template (RAG Q&A / UMKM / Kosong) | Advanced → `createStudioGuideFlow(template)` |
| UC-25 | Runtime node pipeline (listen→rag→sql→action) | Middleware `GuideFlowService` |
| UC-18 | Uji prompt & konfigurasi model (sandbox, tanpa RAG) | Advanced → Playground → `studioPlaygroundTest` |
| UC-18b | Lihat metrik latency & token per run | Advanced → Playground |

## Proses indeksasi (Sistem / Middleware)

Dipicu otomatis setelah **UC-05**, **UC-06**, atau **UC-08** via `StudioIngestionService.ingestSource()`:

| ID | Langkah | Kode |
|----|---------|------|
| UC-19 | Ekstraksi teks dari file | `RagService.extractDocumentText()` |
| UC-20 | Chunking teks | `chunkText()` (~1200 char, overlap 150) |
| UC-21 | **Vektorisasi (embedding)** | `RagService.embedText()` per chunk |
| UC-22 | Simpan chunk + vektor ke DB | tabel `studio_source_chunks` |

**Indeksasi** di UI = seluruh pipeline UC-19 s/d UC-22. **Vektorisasi (UC-21)** adalah langkah kritis agar semantic search / RAG berfungsi.

Status di UI: `pending` (antrian) → `parsing` (UC-19..21 berjalan) → `done` (terindeks, N chunk) atau `error`.

## Relasi

- **UC-36** — layout utama: Sources | Chat | Studio; Advanced untuk Playground & Guide flows.
- **UC-05 s/d UC-09, UC-29–30, UC-33** berada di **panel Sources (kiri)**.
- **UC-05, UC-06, UC-08, UC-33** `<<include>>` **UC-19** — tambah/upload/import/reindex memicu pipeline indeksasi.
- **UC-19 → UC-20 → UC-21 → UC-22** — rangkaian `<<include>>` proses sistem.
- **UC-09** `<<extend>>` **UC-31** — saat semua sumber terindeks, brief otomatis di-generate.
- **UC-10** `<<include>>` **UC-29** (filter `sourceIds`) dan **UC-30** (`chat_instruction`).
- **UC-10, UC-11, UC-14, UC-17, UC-34** `<<include>>` **UC-09** — butuh chunk + embedding selesai.
- **UC-13** `<<extend>>` **UC-32** — klik kutipan membuka preview chunk.
- **UC-35** `<<include>>` **UC-34** — artefak yang di-generate masuk library output.
- **UC-37** `<<include>>` **UC-30** — update notebook menyimpan instruksi chat.

## Render PlantUML

```bash
plantuml docs/aistudio/studio/use-case-diagram.puml
```
