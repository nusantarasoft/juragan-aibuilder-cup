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

**What:** Re-run purchase (`beli 5 …` → belanja → ya), empty cousin-sale slots, `cek stok`, and `daftar barang` with ≥8s between turns. Ignore WAHA messages that start with `Laporan harian otomatis`.

**Why:** /qa 2026-08-17 wrote two `ecom_orders` (2x and 3x indomie) but 0 purchases. Reply capture mixed cron reports; inbound rate limit fired twice. Ground truth is logs+DB, not the first fromMe body.

**Context:** Report `.gstack/qa-reports/qa-report-umkm-wa-live-2026-08-17.md` and cycle `.gstack/qa-reports/qa-report-umkm-cycle-2026-08-17.md`. Cycle C1–C10 passed with 9s gaps. C11 `ya` during modal slot renamed the item; C12–C17 swallowed by `await_purchase`. **Fixed by /qa on master, 2026-08-17** (`45d681a` deployed). Retest `.gstack/qa-reports/qa-report-umkm-c11-retest-2026-08-17.md`: `beli 5` → `belanja` → `2500` → `ya` wrote `BL-20260817-6025`; cek stok sisa 28; omzet/laporan/daftar live. C16 restock ask live PASS after `319afc6` (query strip + refill hint, no Vertex). **Cycle with Groq 2026-08-17:** SKU `teh pucuk groq` PHY-000004; sale `WA-20260817-062221-2222`; purchases `BL-20260817-9799` + `BL-20260817-3759`; on_hand 31; C16 Groq synthesized restock (not canned fallback).

**Effort:** S
**Priority:** P2
**Depends on:** none
**Status:** done 2026-08-17

### Native WhatsApp confirm buttons

**What:** Interactive confirm/cancel buttons (or list messages) on pending sale instead of parsing `ya` / `batal`.

**Why:** Text confirm is easy to mistype; native buttons are the WhatsApp-native confirm UX.

**Context:** CEO 2026-08-17 intake plan D4.2 (was Aug 16 D4.1). Dual confirm stacks (Guide Flow vs durable pending sale) must stay on the durable `handleMessage` path. Start from WAHA send-message button payload + `detectUmkmConfirmReply`.

**Effort:** M
**Priority:** P2
**Depends on:** Intake admin PR shipped
**Status:** done 2026-08-19 — try `sendButtons`, then GOWS/NOWEB `sendList` (Ya, simpan / Batal); tap ids map to `ya`/`batal`; text fallback. WEBJS Core returns 501 for buttons.

### Last-item memory (“satu lagi”)

**What:** Repeat the last recorded sale item/qty as a one-tap “satu lagi” without retyping the product.

**Why:** Delight for kasir; stale-state risk if the last item is from an old session.

**Context:** CEO 2026-08-17 intake plan D4.3 deferred. Attach to the same pending-sale slot loop after muddy-intent ships.

**Effort:** S
**Priority:** P3
**Depends on:** Intake admin PR shipped

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

**Context:** CEO 2026-08-16 D4.4 deferred. Needs media pipeline (WAHA download already exists for inbound media annotations). Not a routing fix.

**Effort:** L
**Priority:** P3
**Depends on:** Kill-guide-flow PR; media ingest

### Official WhatsApp Cloud API vs WAHA

**What:** Optional official WhatsApp Business Cloud API path alongside unofficial WAHA.

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

## Completed

### Natural sale correction

**What:** Understand “salah, maksudnya 2” and patch the pending sale without cancel+retype.

**Shipped:** `653f1c3` (qty revise on pending sale). CEO 2026-08-16 D4.3 / intake baseline.

### Ambiguous-intent clarification (intake D4.1)

**What:** When the job is muddy (`indomie 2`, `beli 10 x`), ask jual vs tambah stok / belanja instead of guessing or falling through to RAG.

**Shipped:** intake admin PR. CEO 2026-08-17 D4.1 (Aug 16 D4.2). Deterministic matcher + `await_job_clarification`; unknown never RAG.
