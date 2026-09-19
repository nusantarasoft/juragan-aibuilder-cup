# TODOS

## Auth

### Auth Phase 2: httpOnly session cookie

**What:** Replace presence cookie `ns_auth=1` with httpOnly session cookie (optional Nest cookie auth); reduce localStorage JWT dependence for UI gate.

**Why:** Presence flag is spoofable; XSS can still steal LS tokens. HOLD gate closes “admin page without login” but is not final auth posture.

**Context:** CEO HOLD review 2026-08-07 chose hybrid presence cookie + AuthGate; API already uses `GqlAuthGuard`. Start from `admin/src/middleware.ts` + `graphqlClient` cookie helpers after HOLD ships.

**Effort:** L
**Priority:** P2
**Depends on:** HOLD admin auth gate shipped

### Playwright e2e for admin auth gate

**What:** E2E: anon `/admin` → login; safe `?next=`; `/shared/studio/:token` public; logout clears cookie.

**Why:** Unit tests miss middleware matcher + real browser cookie behavior.

**Context:** HOLD chose unit + manual smoke (D8). Add after HOLD gate + Playwright CI is green.

**Effort:** M
**Priority:** P3
**Depends on:** HOLD auth gate shipped; Playwright CI healthy

## UMKM

### Union-merge default UMKM command keywords

**What:** Make `resolveUmkmCommands` union DEFAULT keyword lists into notebook `umkm_commands` (add, never replace). Empty array must not delete default phrases.

**Why:** Stamped notebooks freeze an old `record_sale` list. Live S5 (`tadi ada yang beli …`) failed while CI used DEFAULT. Cousin-sale PR hardcodes two phrases; the next DEFAULT addition will miss production the same way.

**Context:** CEO 2026-08-17 cousin-sale HOLD (D1 A, D10 A). `resolveUmkmCommands` in `middleware/src/studio/studio-umkm-commands.ts` previously treated a present keyword array as a full replace. Do not open an LLM-router.

**Effort:** M
**Priority:** P2
**Depends on:** Cousin-sale S5 PR shipped
**Status:** done 2026-08-19 — keyword arrays union into DEFAULT; menu/confirm/cancel still replace.

### Intake owns all clear UMKM jobs (not notebook stamp)

**What:** Matcher/heuristics (not stamped `umkm_commands`) decide clear jobs: sale, purchase, stock, omzet, list. Notebook keywords are additive aliases only. Not an LLM-router. Mixed `beli` stays clarify.

**Why:** After cousin-sale S5, only two phrases ignore the stamp. “Speak like a cousin” is still false for omzet/stok/daftar on old notebooks.

**Context:** CEO 2026-08-17 cousin-sale HOLD D1 C deferred, D11 A. Parent plan `2026-08-17-umkm-intake-admin.md`. Start from `matchUmkmIntakeJob` after S5 ships; cleaner after union-merge (D10). First live /qa 2026-08-17 S9 `omzet hari ini berapa ya` looked like help (noisy capture). Retest after `45d681a`: same phrase returned Laporan. C17 `berapa yang beli hari ini?` is hardcoded `sales_report` (not jual, not help), same stamp-ignore pattern as cousin-sale — not full union-merge.

Production `studio_settings` uses **Groq** / `openai/gpt-oss-20b` (free-tier replacement after Llama 3.1 8B Instant shutdown 2026-08-16). Full cycle 2026-08-17 with SKU `teh pucuk groq`: sale `WA-20260817-062221-2222`, purchases `BL-20260817-9799` + `BL-20260817-3759`, on_hand 31. C16 restock was Groq prose (sisa 31, saran ~35), not the canned fallback.

**Effort:** L
**Priority:** P3
**Depends on:** Cousin-sale S5 PR; better after union-merge default keywords
**Status:** done 2026-08-19 — matcher owns clear omzet/stok/daftar/belanja (+ cousin extras); mixed `beli` stays clarify; stamp aliases remain additive via union-merge.

### Dirty catalog SKU from earlier QA

**What:** Production item `indomie goreng harga jual` (PHY-000001) sits beside `indomie goreng` (PHY-000002). Rename or archive the leftover SKU.

**Why:** Etalase and matching show a fake product named after a slot prompt. Kasir can pick the wrong line.

**Context:** Found by /qa live WA 2026-08-17 on tenant `umkm-warung-klontong-bahagia`. Leftover from ISSUE-003 (harga jual swallowed into the name). Data fix, not matcher. **Fixed by /qa on master, 2026-08-17:** `PHY-000001` set `status=inactive`. Active etalase is `indomie goreng` PHY-000002 + `teh pucuk groq` PHY-000004 (`teh pucuk cyc` PHY-000003 archived 2026-08-19 as duplicate test SKU).

**Effort:** S
**Priority:** P3
**Depends on:** none
**Status:** done 2026-08-17

### Live WA isolated retest (spacing + cron)

**What:** Re-run purchase (`beli 5 …` → belanja → ya), empty cousin-sale slots, `cek stok`, and `daftar barang` with ≥8s between turns. Ignore Hermes messages that start with `Laporan harian otomatis`.

**Why:** /qa 2026-08-17 wrote two `ecom_orders` (2x and 3x indomie) but 0 purchases. Reply capture mixed cron reports; inbound rate limit fired twice. Ground truth is logs+DB, not the first fromMe body.

**Context:** Report `.gstack/qa-reports/qa-report-umkm-wa-live-2026-08-17.md` and cycle `.gstack/qa-reports/qa-report-umkm-cycle-2026-08-17.md`. Cycle C1–C10 passed with 9s gaps. C11 `ya` during modal slot renamed the item; C12–C17 swallowed by `await_purchase`. **Fixed by /qa on master, 2026-08-17** (`45d681a` deployed). Retest `.gstack/qa-reports/qa-report-umkm-c11-retest-2026-08-17.md`: `beli 5` → `belanja` → `2500` → `ya` wrote `BL-20260817-6025`; cek stok sisa 28; omzet/laporan/daftar live. C16 restock ask live PASS after `319afc6` (query strip + refill hint, no Vertex). **Cycle with Groq 2026-08-17:** SKU `teh pucuk groq` PHY-000004; sale `WA-20260817-062221-2222`; purchases `BL-20260817-9799` + `BL-20260817-3759`; on_hand 31; C16 Groq synthesized restock (not canned fallback).

**Effort:** S
**Priority:** P2
**Depends on:** none
**Status:** done 2026-08-17

### Native WhatsApp confirm buttons

**What:** Interactive confirm/cancel buttons (or list messages) on pending sale instead of parsing `ya` / `batal`.

**Why:** Text confirm is easy to mistype; native buttons are the WhatsApp-native confirm UX.

**Context:** CEO 2026-08-17 intake plan D4.2 (was Aug 16 D4.1). Dual confirm stacks (Guide Flow vs durable pending sale) must stay on the durable `handleMessage` path. Start from WhatsApp send-message button payload + `detectUmkmConfirmReply`.

**Effort:** M
**Priority:** P2
**Depends on:** Intake admin PR shipped
**Status:** done 2026-08-19 — Nest intake try `sendButtons`, then GOWS/NOWEB `sendList` (Ya, simpan / Batal); tap ids map to `ya`/`batal`; text fallback. WEBJS Core returns 501 for buttons.  
**Hermes (2026-09-20):** after draft, best-effort bridge `/send-poll` (`question` + `options`: `Ya, simpan` / `Batal`) from `kasir-tools/writes.py`; fail-open to text *ya*; SOUL treats poll labels as confirm/cancel.

### Last-item memory (“satu lagi”)

**What:** Repeat the last recorded sale item/qty as a one-tap “satu lagi” without retyping the product.

**Why:** Delight for kasir; stale-state risk if the last item is from an old session.

**Context:** CEO 2026-08-17 intake plan D4.3 deferred. Attach to the same pending-sale slot loop after muddy-intent ships.

**Effort:** S
**Priority:** P3
**Depends on:** Intake admin PR shipped
**Status:** shipped 2026-09-20 — `kasir_repeat_last_sale` + `kasir_last_sale.json` (24h TTL) on Hermes volume; confirm sale remembers first line item.

### Tutup toko daily recap

**What:** “Tutup toko” sends a daily omzet/stok recap instead of requiring `laporan` / digit 6.

**Why:** Closing ritual is how owners talk; the report job already exists if they ask.

**Context:** CEO 2026-08-17 intake plan D4.4 deferred.

**Effort:** S
**Priority:** P3
**Depends on:** Intake admin PR shipped

### Voice note / foto nota as sale input

**What:** Treat a voice note or photo of a receipt as a sale (STT / vision → same pending confirm).

**Why:** Many pemilik toko speak faster than they type; nota photos are the real ledger.

**Context:** CEO 2026-08-16 D4.4 deferred. Needs media pipeline (Hermes download already exists for inbound media annotations). Not a routing fix.

**Effort:** L
**Priority:** P3
**Depends on:** Kill-guide-flow PR; media ingest

### Official WhatsApp Cloud API vs Hermes

**What:** Optional official WhatsApp Business Cloud API path alongside unofficial Hermes/Baileys.

**Why:** Ban-risk on unofficial stacks is real; Cloud API needs Meta app, templates, webhooks.

**Context:** CEO 2026-08-16 D4.5 deferred. Different project from killing Guide Flow.

**Effort:** XL
**Priority:** P3
**Depends on:** none (parallel product)

### Staff vs owner phone roles

**What:** Distinguish who may confirm a sale vs who receives daily recap.

**Why:** One shared inbox mixes kasir and pemilik; wrong person confirming is an ops bug.

**Context:** CEO 2026-08-16 D4.6 deferred. Allowlist exists; role model is in docs, not wired.

**Effort:** M
**Priority:** P3
**Depends on:** Kill-guide-flow PR

### Weekly proactive pendamping cron (D3.1)

**What:** Push weekly coach ritual to allowlist phones via cron (same pattern as `studio-umkm.cron.ts` daily laporan).

**Why:** Proactive mentoring after on-demand `pendamping` proves value; avoids building cron before usage signal.

**Context:** CEO plan `2026-08-20-umkm-pendamping-bisnis.md` D3.1 DEFER. On-demand v1 must ship first; do not clash with daily laporan push timing.

**Effort:** M
**Priority:** P3
**Depends on:** Pendamping v1 shipped; pilot metrics show repeat `pendamping` usage

### Vector RAG `search_curriculum` (D5 defer)

**What:** Optional vector retrieve over warung curriculum corpus when static markdown inject is too thin.

**Why:** Static playbook cap (~3k chars) may miss niche scenarios; full notebook RAG stays wrong for unknown inbound.

**Context:** CEO plan D5 B accepted static v1; D3.2 original RAG amended away. Trigger: QA finds generic tips despite rich static file.

**Effort:** M
**Priority:** P3
**Depends on:** Static pendamping v1 QA; separate from notebook indexer for unknown

### Human mentor HITL brief (D3.3)

**What:** Escalate coach turn to human mentor with shop context brief (omzet/stok snapshot + user question).

**Why:** High-stakes advice beyond LLM comfort; product north star includes human layer eventually.

**Context:** CEO plan D3.3 DEFER. Blocked on staff vs owner phone roles (above). No extra coach ACL in v1.

**Effort:** L
**Priority:** P3
**Depends on:** Staff vs owner roles; pendamping v1 shipped

## Hermes

Tracker: [`docs/aistudio/umkm-wa/system/hermes-gaps.md`](docs/aistudio/umkm-wa/system/hermes-gaps.md) (G1–G12 status).

## Completed

### Persist kasir sale/purchase drafts across Hermes restart

**What:** Persist `_DRAFTS` (sale/purchase confirm state) to Hermes volume so `ya` survives container recreate/redeploy.

**Shipped:** 2026-09-20 — `writes.py` mirrors drafts to `KASIR_IDENTITY_DIR/kasir_drafts.json` (override `KASIR_DRAFTS_PATH`); TTL 15m; unit `test_draft_persist.py`.

### Agent-outbound WA text sanitizer (Hermes gateway egress)

**What:** When Hermes supports pre-send/outbound hook or fail-closed error-text config, sanitize all allowlisted agent WhatsApp messages (not only tool returns / DAFTAR `_send_wa_text`).

**Why:** Leak eng-review D8 residual — tool→model→WA paraphrase can still emit `kasir_*` / internals without gateway filter. Tool-return wrapper is soft relative to true egress.

**Pros:** Hard last-mile for kasir chats.

**Cons:** May require Hermes version/hook that does not exist yet; avoid forking the image.

**Context:** Probe during leak-hardening implement (`exposeErrorText`, plugin hooks). Document residual in `docs/aistudio/umkm-wa/system/hermes-gaps.md` until this lands.

**Effort:** M–L
**Priority:** P2
**Depends on:** Leak PR probe notes; usable Hermes egress API or config

### Spike WhatsApp Cloud API migration (gap G1) — HOLD

**What:** Evaluate Meta Cloud API vs Baileys for production kasir.

**Why / decision:** **HOLD 2026-09-19** — tetap Baileys dulu (QR Admin, shared inbox, tanpa WABA). Buka lagi hanya jika ban/protocol stability memaksa.

**Context:** `docs/aistudio/umkm-wa/system/hermes-gaps.md` G1 HOLD.

**Effort:** XL
**Priority:** P4 (parked)
**Depends on:** Explicit product un-hold

## Completed

### G2 fail-closed: kasir plugins must be enabled

**What:** Deploy/smoke must fail if `kasir-pipe` / `kasir-tools` missing from `plugins.enabled` while gateway allowlist is `*`.

**Shipped:** 2026-09-19 — `deploy-kasir-tools.py` runs `hermes-kasir-health.py`; `hermes-smoke-test.py` asserts plugins. See `docs/aistudio/umkm-wa/system/hermes-gaps.md` G2 FIXED.

### Nest WhatsApp webhook fail-closed guard (gap G4)

**What:** Guard or 410/no-op on `POST /api/studio/whatsapp/webhook` so a restored pipe forward cannot revive dual-brain.

**Shipped:** 2026-09-19 — default `GoneException` unless `WHATSAPP_WEBHOOK_ENABLED=1`. Simulasi uses `simulateInboundMessage`. See `docs/aistudio/umkm-wa/system/hermes-gaps.md` G4 FIXED.

### Digit cheat-sheet entry for pendamping (v2)

**What:** Add menu digit (e.g. `7`) on 0–6 hub for pendamping without typing exact alias.

**Shipped:** `14b4160` / PR #3 — first-line special-case digit `7` + help/welcome `*7*`; stamp digit 7 suppressed when flag ON.

### Per-tenant pendamping feature flag (v2)

**What:** Notebook/tenant config toggle to disable coach while keeping kasir intake.

**Shipped:** `14b4160` / PR #3 — `context_config.umkm_pendamping_enabled` (missing=ON) + admin Switch dirty-only save.

### Natural sale correction

**What:** Understand “salah, maksudnya 2” and patch the pending sale without cancel+retype.

**Shipped:** `653f1c3` (qty revise on pending sale). CEO 2026-08-16 D4.3 / intake baseline.

### Ambiguous-intent clarification (intake D4.1)

**What:** When the job is muddy (`indomie 2`, `beli 10 x`), ask jual vs tambah stok / belanja instead of guessing or falling through to RAG.

**Shipped:** intake admin PR. CEO 2026-08-17 D4.1 (Aug 16 D4.2). Deterministic matcher + `await_job_clarification`; unknown never RAG.
