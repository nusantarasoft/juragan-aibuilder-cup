# AI Studio — Menu Studio

Use case diagram untuk halaman **Studio** (`/admin/ai-studio`) di modul AI Studio Admin CMS.

## File

| File | Deskripsi |
|------|-----------|
| [use-case-diagram.svg](./use-case-diagram.svg) | Diagram use case (SVG, siap dibuka di browser) |
| [use-case-diagram.puml](./use-case-diagram.puml) | Sumber PlantUML untuk diedit / diekspor ulang |

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
| UC-05 | Tambah sumber dari Media Library | Workspace / Sources |
| UC-06 | Upload file ke notebook | Workspace / Sources |
| UC-07 | Hapus sumber | Sources |
| UC-08 | Reindex sumber | Sources |
| UC-09 | Monitor status indeksasi | Sources (polling + progress UI) |
| UC-10 | Chat RAG (tanya jawab bebas) | AI Assistant |
| UC-11 | Chat guided flow | AI Assistant |
| UC-12 | Mulai chat baru | AI Assistant |
| UC-13 | Lihat referensi sumber jawaban | AI Assistant |
| UC-14 | Generate executive report | Workspace |
| UC-15 | Kelola guide flow (buat / edit / hapus) | Guide flows |
| UC-16 | Publish guide flow | Guide flows |
| UC-17 | Simulasi guide flow | Guide flows |
| UC-18 | Uji prompt & konfigurasi model | Playground |

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

- **UC-05, UC-06, UC-08** `<<include>>` **UC-19** — upload/tambah/reindex memicu pipeline indeksasi.
- **UC-19 → UC-20 → UC-21 → UC-22** — rangkaian `<<include>>` proses sistem.
- **UC-09** memantau seluruh pipeline (bukan hanya upload).
- **UC-10, UC-11, UC-14, UC-17** `<<include>>` **UC-09** — butuh chunk + embedding selesai.
- **UC-16** `<<extend>>` **UC-11** — flow published otomatis memulai sesi guided.

## Render PlantUML

```bash
plantuml docs/aistudio/studio/use-case-diagram.puml
```
