# AI Studio — Menu Studio

Use case diagram untuk halaman **Studio** (`/admin/ai-studio`) di modul AI Studio Admin CMS.

## File

| File | Deskripsi |
|------|-----------|
| [use-case-diagram.svg](./use-case-diagram.svg) | Diagram use case (SVG, siap dibuka di browser) |
| [use-case-diagram.puml](./use-case-diagram.puml) | Sumber PlantUML untuk diedit / diekspor ulang |
| [TESTING.md](./TESTING.md) | Panduan unit, integration, dan E2E test Studio |

## Aktor

| Aktor | Peran |
|-------|--------|
| **Pengguna Admin** | Pengguna CMS terautentikasi yang mengelola notebook, sumber, chat, dan guide flow |
| **Middleware** | Backend NestJS: `StudioIngestionService`, RAG, guide flow, generate report |

## Ringkasan use case (Admin)

| ID | Use case | Tab / Area |
|----|----------|------------|
| UC-01 | Lihat daftar notebook | Sidebar kiri |
| UC-02 | Buat notebook | Sidebar / modal |
| UC-03 | Pilih notebook | Sidebar |
| UC-04 | Hapus notebook | Sidebar |
| UC-05 | Tambah sumber dari Media Library | Panel Sources (sidebar) |
| UC-06 | Upload file ke notebook | Panel Sources (sidebar) |
| UC-07 | Hapus sumber | Panel Sources (sidebar) |
| UC-08 | Reindex sumber | Panel Sources (sidebar) |
| UC-09 | Monitor status indeksasi | Panel Sources (polling + progress UI) |
| UC-10 | Chat RAG (tanya jawab bebas) | AI Assistant → `studioChat` |
| UC-11 | Chat guided flow | AI Assistant → `studioGuidedChat` |
| UC-12 | Mulai chat baru | AI Assistant |
| UC-13 | Lihat referensi sumber jawaban (skor relevansi) | AI Assistant |
| UC-26 | Lanjutkan riwayat percakapan | AI Assistant → `studioConversation` |
| UC-27 | Pilih mode chat (bebas / guided) | AI Assistant (Segmented) |
| UC-14 | Generate executive report | Workspace |
| UC-15 | Kelola guide flow (buat / edit / hapus) | Guide flows |
| UC-16 | Publish guide flow | Guide flows |
| UC-17 | Simulasi guide flow | Guide flows |
| UC-23 | Validasi graph flow (Zod + XState coverage) | Guide flows → `studioValidateGuideFlow` |
| UC-24 | Buat flow dari template (RAG Q&A / UMKM / Kosong) | Guide flows → `createStudioGuideFlow(template)` |
| UC-25 | Runtime node pipeline (listen→rag→sql→action) | Middleware `GuideFlowService` |
| UC-18 | Uji prompt & konfigurasi model (sandbox, tanpa RAG) | Playground → `studioPlaygroundTest` |
| UC-18b | Lihat metrik latency & token per run | Playground (chart + Last Run) |

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

- **UC-05 s/d UC-09** berada di **panel Sources (sidebar)** — satu titik kelola dokumen notebook (tambah, upload, hapus, reindex, pantau tervektor).
- **UC-05, UC-06, UC-08** `<<include>>` **UC-19** — upload/tambah/reindex memicu pipeline indeksasi.
- **UC-19 → UC-20 → UC-21 → UC-22** — rangkaian `<<include>>` proses sistem.
- **UC-09** memantau seluruh pipeline (bukan hanya upload).
- **UC-10, UC-11, UC-14, UC-17** `<<include>>` **UC-09** — butuh chunk + embedding selesai.
- **UC-10** memakai query understanding multi-turn sebelum RAG; **UC-13** menampilkan kutipan dengan skor relevansi.
- **UC-26** `<<extend>>` **UC-10** — lanjutkan percakapan lama dari riwayat.
- **UC-27** mengatur mode **Chat bebas** vs **Guided** di panel AI Assistant.
- **UC-12** `<<extend>>` **UC-10** atau **UC-11** — reset sesi chat.
- **UC-16** `<<extend>>` **UC-11** — flow published otomatis memulai sesi guided.
- **UC-15** `<<include>>` **UC-23** — validasi sebelum save/publish; **UC-24** saat buat flow baru dari template.
- **UC-11, UC-17** `<<include>>` **UC-25** — eksekusi node pipeline di middleware.
- **UC-18** memanggil mutation GraphQL `studioPlaygroundTest` — system + user prompt, temperature, max tokens; **tidak** memakai sumber notebook (bukan RAG).
- **UC-18b** menampilkan latency, provider, model, dan token dari respons API di sesi Playground.

## Render PlantUML

```bash
plantuml docs/aistudio/studio/use-case-diagram.puml
```
