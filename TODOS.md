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

### Native WhatsApp confirm buttons

**What:** Interactive confirm/cancel buttons (or list messages) on pending sale instead of parsing `ya` / `batal`.

**Why:** Text confirm is easy to mistype; native buttons are the WhatsApp-native confirm UX.

**Context:** CEO 2026-08-16 SELECTIVE EXPANSION deferred (D4.1). Dual confirm stacks (Guide Flow vs durable pending sale) must stay on the durable `handleMessage` path after the kill-guide-flow PR. Start from WAHA send-message button payload + `detectUmkmConfirmReply`.

**Effort:** M
**Priority:** P2
**Depends on:** UMKM always uses `StudioUmkmService` (this CEO plan)

### Ambiguous-intent clarification

**What:** When intent is muddy, ask “maksudnya catat penjualan atau cek stok?” instead of guessing or falling through to RAG.

**Why:** Free-text owners will send mixed messages; a wrong commit is worse than one clarifying turn.

**Context:** CEO 2026-08-16 D4.2 deferred. `understandUmkmQuery` already has `needs_clarification`. Wire it as the default unknown path after agentic-ask for `ask` ships.

**Effort:** M
**Priority:** P2
**Depends on:** Agentic tanya on `handleMessage` ask path (OV1)

### Natural sale correction

**What:** Understand “bukan 3, 2 saja” and patch the pending sale without cancel+retype.

**Why:** Correction is how people actually talk; cancel+retype is the remaining rigidity after killing Guide Flow.

**Context:** CEO 2026-08-16 D4.3 deferred. Pending sale lives in durable session / `studio_umkm_pending_sales`.

**Effort:** M
**Priority:** P2
**Depends on:** Kill-guide-flow PR shipped

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
