# Audit dummy vs real — 2026-10-15

**Branch audit awal:** `cursor/dummy-vs-real-audit-2026-10-15` (read-only code review + QA browser terbatas)  
**Phase 1 closure (F1-4 + D-3):** `cursor/honest-live-demo-f1-4-999e` — Live/Demo labels across AI Studio / AOS / VO; full-stack QA screenshots.  
**Metode:** grep mock/demo/seed + baca alur runtime; browser admin `:3003` dengan middleware `:4001` + Docker stack (Phase 1 QA).

---

## Ringkasan (Bahasa Indonesia)

**Phase 1 (F1-1…F1-4):** **AI Studio** notebook/UMKM/Kasir/upload/RAG = **REAL** bila stack lengkap; **Web Crawler** (P2-1) dan **Knowledge Graph** (P2-2) = **REAL** dengan tag **Live**; **Agent Builder**, **Label Studio dashboard**, dan **simulasi chat WA** = **DEMO** dengan banner/tag **Demo** jelas (D-3). **Agentic OS** task queue + worker + GraphQL = **REAL**; badge **Live** di Command Deck toolbar dan roster kecuali `aos_settings.ui_demo_mode` / `AOS_UI_DEMO_MODE` (D-2, F1-4). **Virtual Office** default **Live** via `osAgentSource` (F1-2); `mockAgentSource` hanya saat UI demo mode (D-1). **Kasir** mirror ke AOS queue + metrik live (F1-3). Tenant produksi **`umkm-warung-klontong-bahagia`** tetap **uncertain** di seed local (D-4).

**QA browser (2026-10-15):** Admin dev webpack `:3003`, login via token + GraphQL mock. Screenshot: `/cursor/stores/self/media/dummy-audit-*.png`. Console: `ERR_CONNECTION_REFUSED` ke `:4001` (socket.io), `:8000` (Supabase realtime); beberapa chunk/layout warning saat navigasi cepat.

---

## Legenda

| Label | Arti |
|--------|------|
| **REAL** | Data/aksi dari DB, middleware, Hermes/WA, atau LLM sungguhan |
| **DEMO** | Mock, simulasi, seed UI, atau progress palsu |
| **MIXED** | Backend nyata + simulasi/label/UI yang tidak selaras |

---

## AI Studio

### Notebook utama (chat, sources, upload, RAG)

| Fitur | Status | Bukti |
|--------|--------|--------|
| Daftar notebook, CRUD | **REAL** | `admin/src/lib/studioService.ts` → GraphQL; `admin/src/app/admin/ai-studio/page.tsx` |
| Upload sumber / parse / embed | **REAL** (bergantung stack) | `SourcesPanel`, status parse di `studioSourceStatus.ts` (bukan mock progress) |
| Chat notebook (RAG) | **REAL** (bergantung provider AI) | `useStudioChat.ts`, `chatActions.ts` → middleware |
| Flashcards / Quiz / Mind map / Audio·Video overview | **REAL** (generatif) | `flashcards.ts`, `quiz.ts`, `videoOverview.ts` — panggil backend, bukan array hardcoded |
| Share notebook | **REAL** | `studioService` share token mutations |
| Status sumber “seed” | **REAL** (istilah internal) | `seedSourceStatusMap` = map status awal, bukan data palsu (`studioSourceStatus.ts:149`) |

### UMKM + Kasir + WA

| Fitur | Status | Bukti |
|--------|--------|--------|
| Daftar tenant WA, perintah, approve registrasi | **REAL** | `umkm/page.tsx:184-210` → `studioService.listWhatsAppConfigs`, `listUmkmRegistrations` |
| Pendamping bisnis (toggle + WA coach) | **REAL** (flag notebook) | `umkm/page.tsx:149-152`, `umkm_pendamping_enabled`; backend `studio-umkm-pendamping.service.ts` |
| **Simulasi chat WA** (bukan kirim WA live) | **MIXED** (jujur dilabel) | `WhatsAppSimChatDrawer` — tag **Demo** + copy simulasi; pipeline webhook, tanpa outbound WA |
| Kasir (transaksi/stok via WA) | **REAL** (production path) | `middleware/src/studio/studio-umkm.service.ts`, Hermes plugins |
| Owner phones hardcoded demo | **DEMO** (hanya placeholder UI) | `WhatsAppSimChatDrawer.tsx:34` default `6280000000001` |

### Upload / RAG (middleware)

| Fitur | Status | Bukti |
|--------|--------|--------|
| Embedding + vector search | **REAL** | `middleware/src/rag/rag.service.ts` → Supabase RPC `match_media_embeddings` |
| Komentar “Mocking” di RAG | **REAL** (komentar legacy) | `rag.service.ts:327` — implementasi aktual memakai `getVertexEmbedding` di bawahnya |

### Sub-halaman AI Studio lain

| Fitur | Status | Bukti |
|--------|--------|--------|
| Web Crawler jobs | **REAL** (labeled **Live**) | `studio_web_crawl_jobs` + middleware worker + GraphQL; admin `webCrawlerService` → API; **Live** banner/tag (P2-1) |
| Knowledge Graph | **REAL** (labeled **Live**) | `studio_knowledge_graph_*` RPC + GraphQL; pgvector search via `match_studio_chunks_for_tenant`; **Demo** only when `aos_settings.ui_demo_mode` (P2-2, F1-4) |
| Agent Builder | **DEMO** (labeled) | Mock canvas + `StudioDemoBanner` / **Demo** tag (F1-4) |
| Label Studio dashboard | **DEMO** (labeled) | Static `PROJECTS` + **Demo** banner (F1-4); open Label Studio = service nyata bila `:8080` up |
| Settings / provider keys | **REAL** (simpan config) | `settings/` → GraphQL studio settings |
| AI Gateway | **REAL** (bergantung stack) | `ai-gateway/page.tsx` → `studioService` WA config |

---

## Agentic OS

### Task queue & runner

| Fitur | Status | Bukti |
|--------|--------|--------|
| CRUD task, queue, approval | **REAL** | `TaskManager.tsx` → `aosApi`; DB `aos_tasks` |
| Runner advance progress | **REAL** (worker persisted) | `agentic-os.runner.ts` — `@Interval(5000)` updates `aos_tasks` in Postgres; step logic deterministic until LLM runners |
| GraphQL task feed + subscription | **REAL** | `aosTasks` query + `aosTaskQueueUpdated` subscription (`aos-task-queue.events.ts`); Command Deck / Task Manager via `useAosStore` |
| Seed task/agent awal | **MIXED** (data awal) | Seed rows in `20261006000000_agentic_os.sql`; queue worker treats them like any other task |
| Copy UI “not live yet” | **FIXED (2026-10-15 F1-1)** | Overview copy + Live badges for DB agents unless `aos_settings.ui_demo_mode` |

### Command Deck (graph / orbit)

| Fitur | Status | Bukti |
|--------|--------|--------|
| Graph / orbit nodes | **MIXED** | Data node dari GraphQL REAL (`CommandDeck.tsx:8`, `deckStore.ts` → `fetchDeck`); layout deterministik bukan mock bisnis (`deckGraph.ts:8-9`) |
| Deck goals / reviews | **REAL** (endpoint Phase 4) | `deckStore.ts:6-7`, state `unavailable` jika gagal |

### Agents list & recruitment

| Fitur | Status | Bukti |
|--------|--------|--------|
| Agent Studio roster (DB) | **REAL** | `AgentStudio.tsx` → `useAosStore` / `fetchSnapshot` |
| Badge **Demo** pada agent DB | **FIXED (D-2 / F1-4 slice)** | `firstEmployee.ts` — **Live** for persisted roster agents; **Demo** only when `uiDemoMode` / `AOS_UI_DEMO_MODE` |
| Kasir “first recruited employee” | **MIXED** | Metrik **Live** (`fetchKasirLiveSnapshot`); “recruitment” metaforis ke AI Studio, bukan HR module |
| HR Recruitment (`/admin/hr/recruitment`) | **REAL** (modul HR ERP) | `recruitment/page.tsx:17-18` GraphQL `hrJobPostings` / `hrApplicants` — **bukan** Agentic OS |

### Pulse / workflows / audit

| Fitur | Status | Bukti |
|--------|--------|--------|
| Audit feed Overview | **REAL** | `SystemApps.tsx:18-36` → `fetchAudit` |
| Pulse LLM | **MIXED** | `graphqlMocks` `llmMode: 'dry_run'`; production tergantung settings |
| Stats KPI Overview | **REAL** | `aosStats` dari DB |

### Kasir live snapshot (lintas produk)

| Fitur | Status | Bukti |
|--------|--------|--------|
| `aosKasirLiveSnapshot` | **REAL** | `aos-kasir-live.service.ts:64-120` counts `studio_whatsapp_sessions`, `ecom_orders`, Hermes session |
| Unavailable fallback | **REAL** (jujur) | `available: false`, `unavailableReason`; UI tidak invent angka (`SystemApps.tsx:78-93`) |
| Tenant mapping | **MIXED** | `resolveWaTenant` fallback `default` + AOS UUID (`aos-kasir-live.service.ts:130-135`) |

---

## Virtual Office

| Fitur | Status | Bukti |
|--------|--------|--------|
| Desks / 3D office | **REAL** (live default) | Floorplan REAL; roster dari `osAgentSource` + `useAosStore` (`runtime.ts`, `officeRuntimeMode.ts`) |
| Progress task di meja | **REAL** (live) | `osAgentSource.ts` maps `aos_tasks` progress/status; subscription + polling via `startAosPolling` / `subscribeAosTaskQueue` |
| Activity feed | **REAL** (live) | Audit poll `fetchAuditFiltered` in `osAgentSource.ts`; demo mode still uses `mockAgentSource` |
| Mode **Live** VO | **FIXED (F1-2 / D-1)** | Default live after snapshot; `mockAgentSource` only when `aos_settings.ui_demo_mode` / `AOS_UI_DEMO_MODE` |
| Badge header Demo / Live | **FIXED** | `TopBar.tsx` — **Live** when `dataMode === 'live'`; **Demo** only explicit UI demo mode |
| Empty tenant | **REAL** (jujur) | `EmptyOfficeBanner.tsx` when no DB-backed agents (`isEmptyLiveOffice`) |
| Kasir di roster VO | **MIXED → REAL (F1-3)** | `kasirLivePoll.ts` — **Live** metrics; `mergeKasirIntoRoster` keeps real `kasir_wa` tasks from AOS when present |
| Kasir WA → AOS task queue | **REAL (F1-3)** | `POST /internal/kasir-consult` → `KasirConsultAosTaskService` (`source: kasir_wa`, redacted summary); fire-and-forget; GraphQL `aosTasks` per tenant |
| Inspector Kasir | **REAL** (read-only) | `AgentInspector.tsx` metrik WA/transaksi |
| Stats tokens/tasks di top bar | **REAL** (live) | Aggregated from live roster agent stats / queue |

---

## Live / Demo badges — kejujuran

| Lokasi | Jujur? | Catatan |
|--------|--------|---------|
| `RosterKindBadge` | Ya | Hanya label Live/Demo |
| VO TopBar “Demo” | Ya | Saat `dataMode === 'demo'` (explicit `ui_demo_mode` only) |
| VO subtitle live vs demo | Ya | Live copy when wired to Agentic OS queue |
| AOS Overview task queue copy | **FIXED (F1-1)** | Describes persisted queue + worker; badges honest per `uiDemoMode` |
| AOS “Agents at work” roster badges | **FIXED (F1-4)** | `SystemApps.tsx` uses `rosterKindForAgent` (was hardcoded Demo) |
| AOS Command Deck toolbar | **FIXED (F1-4)** | `RosterKindBadge` Live/Demo from `uiDemoMode` |
| Agent Studio badge pada DB agents | **FIXED (D-2)** | `rosterKindForAgent` → **Live** unless UI demo mode |
| Web Crawler / KG / Agent Builder UI | **FIXED (D-3 / F1-4)** | **Demo** banner + header tag |

---

## Tenant `umkm-warung-klontong-bahagia`

| Sumber | Temuan |
|--------|--------|
| Seed / migration repo | **Tidak ditemukan** — hanya `default` di `middleware/sql/studio_whatsapp.sql:35-37` |
| Referensi ops | `TODOS.md`, `scripts/master-production/deploy-kasir-tenant-isolation.py:144`, `.gstack/qa-reports/baseline.json` (production QA) |
| **Uncertain (local seed)** | Owner production melihat label/nama dari `studio_whatsapp_config.label`, notebook linked, etalase `ecom_*` tenant-scoped; Kasir live counts filter `tenant_id` effective setelah `resolveWaTenant` |

Di **production** (bukti QA historis): etalase aktif pernah `indomie goreng`, `teh pucuk groq`; bukan data demo UI.

---

## Browser QA

### 2026-10-15 (audit awal, mock GraphQL)

Stack partial — lihat commit audit. Screenshots `dummy-audit-*.png` di Project store `media/`.

### Phase 1 closure — F1-4 (full stack)

**Stack:** `scripts/qa-bootstrap-f1-4-stack.sh` + `apply-migrations.sh` + `scripts/init-cms-admin.mjs`; host middleware **:4001** + admin **:3003**. Playwright gate: `admin/tests/e2e/f1-4-live-demo-fullstack.spec.ts` (**live GraphQL**, no route mocks).

**Screenshot inventory (Project store `media/`):**

| File | Expected label |
|------|----------------|
| `f1-4-aistudio-home-live.png` | Live path (no Demo banner on notebook home) |
| `f1-4-aistudio-crawler-demo.png` | **Demo** |
| `f1-4-aistudio-knowledge-graph-demo.png` | **Demo** |
| `f1-4-aistudio-agent-builder-demo.png` | **Demo** |
| `f1-4-aistudio-label-studio-demo.png` | **Demo** |
| `f1-4-aistudio-umkm-live.png` | Live data / empty honest |
| `f1-4-aistudio-ai-gateway-live.png` | Live settings |
| `f1-4-aistudio-settings-live.png` | Live settings |
| `f1-4-aos-overview-live.png` | **Live** toolbar |
| `f1-4-aos-tasks-live.png` | **Live** |
| `f1-4-aos-agents-live.png` | **Live** |
| `f1-4-aos-governance-live.png` | **Live** |
| `f1-4-vo-live.png` | **Live** header |
| `f1-4-vo-demo.png` | **Demo** header (`ui_demo_mode`) |

**Console:** no blocking errors (socket.io / antd deprecation filtered in spec).

---

## Rencana prioritas (DEMO → REAL)

### P0 — Kejujuran produk & safety

| Item | Effort | Tindakan |
|------|--------|----------|
| Wire VO `osAgentSource` bila AOS reachable; fallback mock | **M** | Ganti `runtime.ts` `startHybrid` → coba live source dulu (`osAgentSource.ts:271` emit live) |
| Perbaiki `rosterKindForAgent` | **S** | Agent dari `aosAgents` = **Live** ( atau hapus badge Demo untuk DB agents) |
| Hapus/update copy “task queue not live” | **S** | `SystemApps.tsx:153` — jelaskan “runner simulasi, bukan LLM” |
| Label Web Crawler / Knowledge Graph / Agent Builder | **S** | Banner **Demo** atau sembunyikan dari menu sampai backend ada |

### P1 — Integrasi nyata

| Item | Effort | Tindakan |
|------|--------|----------|
| VO hapus atau gate `mockAgentSource` untuk user production | **M** | Feature flag `VO_DEMO_AGENTS=false` |
| Runner Phase 2 LLM | **L** | `agentic-os.runner.ts` — eksekusi tool/LLM sungguhan |
| Web crawler backend | **L** | Ganti `webCrawlerService` mock dengan job queue + worker |
| Tenant Klontong di seed dev (opsional) | **S** | Row `studio_whatsapp_config` dokumentasi-only |

### P2 — Polish

| Item | Effort | Tindakan |
|------|--------|----------|
| Command Deck empty states | **S** | Saat `unavailable`, badge di Deck |
| HR Recruitment vs “recruit agent” | **S** | Tooltip bedakan HR vs AOS |
| Socket.io graceful offline | **S** | Jangan spam console jika middleware down |

---

## Docs / diagrams

**Phase 1:** `docs/backlog.md` (F1-4, D-3 DONE; P2-1…P2-4 added). **Diagrams:** N/A — no new ladder level; behavior is UI labeling only (existing L5–L9 unchanged).
