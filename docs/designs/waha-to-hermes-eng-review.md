# Eng Review: WAHA → Hermes migration

Plan source: [waha-to-hermes-migration.md](./waha-to-hermes-migration.md) (APPROVED)
CEO review: [waha-to-hermes-ceo-review.md](./waha-to-hermes-ceo-review.md)
Branch: `master-production` | Date: 2026-08-31 | Mode: FULL_REVIEW

## Decisions logged

| ID | Choice | Meaning |
|----|--------|---------|
| D0 | **A** | Proceed full plan as design doc (no v1 scope cut) |
| D1 | **C** | Dedicated `hermes-to-waha-webhook.normalizer.ts` + call from controller |
| D2 | **A** | Always call idempotent normalizer (pass-through if already WAHA-shaped) |
| D3 | **B** | Pending-sale cutover: SQL/query helper + checklist step (not hard-block redeploy) |
| D4 | **B** | Logs + Hermes reachability when provider=hermes |
| D5 | **A** | Transport includes sendButtons + sendList + sendText (Hermes may fail interactive → fallback) |
| D6 | **B** | Complete CI unit suite + manual server E2E checklist (no Hermes-in-CI) |
| D7 | **B** | New `whatsappTransportHealth` query (~1500ms timeout); leave `health` as `'OK'` |
| X1 | **A** | Keep D0 full plan; hard-gate: no adapter PRs (E2–E7) until E0+E1 Phase 1 pass |
| X2 | **A** | Keep D3 checklist + dedicated cutover preflight script (exit non-zero if pending > 0) |
| X3 | **A** | Keep D7 GraphQL + wire Hermes reachability into cutover preflight |
| T1 | **C** | Admin Hermes session/QR GraphQL **in scope** (was Phase 4) — ship with transport work after E1 |
| T2 | **C** | Require webhook HMAC when key set (fail closed; no soft-skip for missing header in prod/Hermes path) |
| T3 | **C** | Sync Hermes allowlist from `studio_whatsapp_config` (single source of truth) |
| T4 | **C** | Hermes `mem_limit` + pipe-only/no-LLM-key prod docs in E0 |

## Step 0 — Scope challenge

### What already exists (reuse, don't rebuild)

| Asset | Location | Reuse |
|-------|----------|-------|
| WAHA HTTP client | `middleware/src/waha/waha-client.service.ts` | Wrap in `WahaProvider`; keep for admin session/QR until Phase 4 |
| Webhook + HMAC | `studio-whatsapp.controller.ts:19-28`, `studio-whatsapp.service.ts:100-118` | Keep controller; Hermes forwarder must sign with same key |
| Inbound pipeline | `handleWebhook` → `processInboundCore` → `StudioUmkmService` | Unchanged brain |
| Confirm fallback chain | `sendReplyChunks` lines 819-826 | buttons → list → text; HermesProvider inherits same caller logic |
| Button/list parse | `extractUmkmButtonReply`, `studio-whatsapp.util.ts` | May need normalizer to populate WAHA-shaped fields |
| Sim tests | `studio-whatsapp-sim.scenario.spec.ts` | Extend with provider mock token |
| Local Hermes compose | `docker-compose.yml` hermes service | Template for prod compose |
| WAHA specs | `waha-client.service.spec.ts` | Pattern for HermesProvider specs |

### Minimum viable change set

1. `WhatsAppTransport` interface (outbound + `downloadMedia` + `phoneToChatId` + `readonly id`)
2. `WahaProvider` thin wrapper; `HermesProvider` from Phase 1 probe endpoint table
3. `WhatsAppProviderModule` factory on `WHATSAPP_PROVIDER=waha|hermes`
4. Inject transport into `StudioWhatsAppService` (send path + media download) and `NotificationDispatcher`
5. Optional `hermes-to-waha-webhook.normalizer.ts` at webhook boundary (Phase 1 probe decides)
6. Prod compose + env vars (Phase 1 infra, no middleware flag flip until Phase 2)

**Admin session APIs** (`getWahaSessionStatus`, QR, restart) stay on `WahaClientService` directly through Phase 4 — matches design deferral.

### Complexity check

| Signal | Value | Verdict |
|--------|-------|---------|
| Files touched | ~9 (4 new whatsapp/*, 2 consumers, module wiring, compose, docs) | Smell |
| New classes | 3 (`WahaProvider`, `HermesProvider`, module factory) | Smell |
| Direct consumers of transport | **2 only** (`StudioWhatsAppService`, `NotificationDispatcher`) | Small blast radius |
| Parallel systems | None until Phase 3 cutover | OK |

**Recommendation:** Proceed as designed — file count is high but coupling is low; splitting admin APIs out of the provider interface keeps v1 smaller than a monolithic `WhatsAppProvider`.

### TODOS cross-reference

- D4.5 Cloud API — deferred, not blocking
- Phase 1 server probe — **blocks adapter code** (CEO + design hard gate)

---

## Architecture (draft — pending decisions)

### Target data flow

```
INBOUND (Hermes):
  Phone → Hermes Baileys → hook/forward (HMAC) → POST /api/studio/whatsapp/webhook
       → [normalizer?] → handleWebhook (unchanged) → StudioUmkmService

OUTBOUND:
  sendReplyChunks / sendOutboundText / NotificationDispatcher
       → WhatsAppTransport (WahaProvider | HermesProvider)
       → WAHA HTTP | Hermes bridge HTTP
```

### Findings (architecture)

| ID | Sev | Conf | Finding |
|----|-----|------|---------|
| A1 | P1 | 9/10 | `sendReplyChunks`, `sendOutboundText`, `downloadMedia` call `wahaClient` directly — must inject `WhatsAppTransport` |
| A2 | P1 | 8/10 | Webhook expects `body.event`, `body.session`, `body.payload.from` — Hermes forward likely needs normalizer before `handleWebhook` |
| A3 | P2 | 9/10 | `feedbackProvider: 'waha'` hardcoded at line 401 — use `transport.id` |
| A4 | P2 | 8/10 | `sendOutboundText` comment "WAHA only" — cron daily report must use transport when `WHATSAPP_PROVIDER=hermes` |
| A5 | P2 | 7/10 | Admin GraphQL still calls `wahaClient` for session — OK Phase 1-3; document that Hermes QR is SSH-only |
| A6 | P1 | 8/10 | Single hook forward SPOF — if Hermes bridge down, inbound silent; log + manual alert (no new stack) |

### Architecture decisions

**D1 — Normalizer placement: C accepted.**  
`hermes-to-waha-webhook.normalizer.ts` + call from `StudioWhatsAppController.webhook` before `handleWebhook`. Service stays WAHA-shaped. Identity/no-op allowed if Phase 1 proves shape match.

**D2 — Normalizer trigger: A accepted.**  
Controller always runs idempotent normalizer. Heuristic: if payload already has WAHA shape (`event` + `payload.from` / button fields), return unchanged. No Hermes header required; safe for Phase 1–2 dual traffic on one webhook URL.

**D3 note (from X2):** Checklist alone is insufficient for Phase 3. Preflight script is required step 0; still do not hard-block generic `redeploy.sh`.

**D4 — Bridge-down visibility: B accepted (amended by X3).**  
Structured `provider=` logs on webhook + outbound. New `whatsappTransportHealth` GraphQL (~1500ms). Cutover preflight **must** fail if Hermes unreachable when flipping. `health` stays `'OK'`. No new alerting stack.

### Section 1 Architecture — COMPLETE

---

## Section 2 — Code quality

**D5 — Transport confirm surface: A accepted.**  
`WhatsAppTransport`: `id`, `phoneToChatId`, `sendText`, `sendButtons`, `sendList`, `downloadMedia`. Shared `WhatsAppSendResult`. Hermes interactive methods may return `{ success: false }` so existing buttons→list→text ladder in `sendReplyChunks` is unchanged.

### Folded code quality (no further decision)

| ID | Disposition |
|----|-------------|
| Q1 | `WahaSendResult` → shared `WhatsAppSendResult` on transport |
| Q2 | HermesProvider: multi-URL try only if Phase 1 docs multiple endpoints; else single URL |
| Q3 | New `whatsapp/` module imports `WahaModule`; exports `WHATSAPP_TRANSPORT` token; admin session stays on `WahaClientService` |

### Section 2 Code quality — COMPLETE

---

## Section 3 — Tests

**D6 — Test investment: B accepted.**  
CI: factory, WahaProvider, HermesProvider (HTTP mocks; after Phase 1 table), idempotent normalizer, sendReplyChunks confirm ladder with mock transport, NotificationDispatcher, hermesReachable (waha mode = skip/false). Server Phase 2/3: manual QA via eng test-plan artifact for `/qa`. No Hermes container in CI.

### Section 3 Tests — COMPLETE

---

## Section 4 — Performance

Current `health` GraphQL returns bare `'OK'` (`health.resolver.ts:6-7`). D4 requires Hermes reachability without poisoning overall health when provider=waha or Hermes is slow.

**D7 — Health ping: B accepted.**  
New GraphQL field `whatsappTransportHealth`: `{ provider, hermesReachable }` with ~1500ms AbortSignal. When `WHATSAPP_PROVIDER=waha`, return `hermesReachable: null` without calling Hermes. Do **not** change existing `health` string contract.

### Section 4 Performance — COMPLETE

N+1 / memory: N/A — same fetch volume as WAHA. Rate limiter unchanged.

---

## Outside voice (Claude subagent)

Codex not installed. Subagent findings (informational until user decides each tension):

**Top risks:** (1) Phase 1 pipe-only unproven while full adapter scope locked (2) Silent inbound with green `health` (3) Phase 3 checklist-only pending + re-QR on pilot

**Also flagged:** Phase 2 test-number must be on both Hermes allowlist + `studio_whatsapp_config`; E8 compose must precede E1 probe; HMAC missing-header soft-skip; dual allowlist drift; rollback still needs re-QR; no Cloud API win; Hermes RAM/secrets tax on dual-run.

**Cross-model tensions:**
- X1: **A accepted** — Keep D0 full plan; Phase 1 (E0+E1) hard-gates adapter PRs
- X2: **A accepted** — D3 stays; add `scripts/master-production/cutover-hermes-preflight` (pending sales/purchases → exit 1); Phase 3 step 0; not wired into daily redeploy
- X3: **A accepted** — Keep `whatsappTransportHealth`; preflight must also verify Hermes reachable when cutting over; `health` stays `'OK'`

**Hard gate (from X1):** E0 (compose Hermes) → E1 (pipe-only probe) must pass and be documented in `docs/hermes-local.md` **before** merging E2–E7 adapter work.

**E0 (amended T4=C):** Hermes on `docker-compose.master-production.yml` with pinned image + explicit `mem_limit` (tune on server). Prod section in `docs/hermes-local.md`: pipe-only needs no LLM provider keys; dual-run memory budget vs WAHA.

**TODO pass complete.** Cloud API remains in existing TODOS.md D4.5 — not re-asked.

**E12 (from T1=C):** Generalize admin session/QR so ops can pair Hermes without SSH after E0/E1. Prefer provider-aware APIs (`whatsappSessionStatus` / `whatsappAuthQr`); keep WAHA path while `WHATSAPP_PROVIDER=waha`.

**E13 (from T2=C):** When `WAHA_WEBHOOK_HMAC_KEY` is set, missing/invalid `x-webhook-hmac` → `UnauthorizedException` (no warn-and-skip). Optional escape: only if key empty (dev). Add unit tests for missing header. Coordinate with Hermes forwarder signing from Phase 1.

**E14 note:** E1b “register test # on both” becomes “register on studio config → run Sync → Hermes”; still verify after sync.

---

## Code quality (draft)

| ID | Sev | Conf | Finding |
|----|-----|------|---------|
| Q1 | P2 | 9/10 | DRY: `WahaSendResult` type should become shared `WhatsAppSendResult` in transport interface |
| Q2 | P2 | 8/10 | `HermesProvider` should not duplicate retry/url-fallback logic — copy `WahaClientService` pattern for multi-endpoint |
| Q3 | P3 | 9/10 | Keep `WahaClientService` in `waha.module.ts`; new `whatsapp/` module imports `WahaModule`, exports `WHATSAPP_TRANSPORT` token |

---

## Tests (draft)

### Coverage diagram

```
middleware/src/whatsapp/
├── whatsapp-transport.interface.ts
│   └── [GAP] contract test — mock implements all methods
├── waha.provider.ts
│   └── [GAP] delegates to WahaClientService — unit spec
├── hermes.provider.ts
│   ├── sendText [GAP] HTTP mock success/fail
│   ├── sendList [GAP] fail → caller fallback (integration with sendReplyChunks)
│   └── downloadMedia [GAP] null on 404
├── hermes-to-waha-webhook.normalizer.ts (if needed)
│   ├── [GAP] message event shape
│   ├── [GAP] selectedRowId / button reply
│   └── [GAP] LID @lid from field
└── whatsapp-provider.module.ts
    └── [GAP] factory returns waha|hermes from env

studio-whatsapp.service.ts
├── handleWebhook [★★★ sim scenario exists]
├── sendReplyChunks [GAP] provider mock — confirm list fallback
└── sendOutboundText [GAP] uses transport when hermes

notification.dispatcher.ts
└── sendWhatsApp [GAP] provider mock

[→E2E] Phase 2 server: jual → ya → omzet on test number (manual QA doc, not CI)

COVERAGE: 1/14 paths tested (7%) — pre-implementation baseline
```

### Required test files (implementation order)

1. `middleware/src/whatsapp/waha.provider.spec.ts`
2. `middleware/src/whatsapp/hermes.provider.spec.ts` (after Phase 1 endpoint table)
3. `middleware/src/whatsapp/hermes-to-waha-webhook.normalizer.spec.ts` (if probe requires)
4. Extend `studio-whatsapp-sim.scenario.spec.ts` — inject mock transport
5. `notification.dispatcher.spec.ts` — whatsapp channel uses transport

---

## Performance (draft)

No issues — same HTTP fetch pattern as WAHA; rate limiter unchanged.

---

## Failure modes

| Codepath | Failure | Test? | Handling? | User sees |
|----------|---------|-------|-----------|-----------|
| Hermes forward down | No webhook | N | Log only | Silence — **CRITICAL** (Phase 1 probe + manual monitor) |
| HMAC mismatch | 401 | Y (existing) | UnauthorizedException | No reply |
| sendList unsupported | Confirm broken | Partial | Text fallback in sendReplyChunks | "ketik ya/batal" |
| Cutover mid-pending-sale | Lost confirm | N | Preflight script | Blocked cutover |
| HMAC missing header | Unsigned webhook accepted | Y (E13) | Fail closed | 401 |
| Dual allowlist drift | Hermes drops before middleware | Y (E14) | Sync from studio config | Brief miss until sync |

---

## Implementation tasks (eng)

| ID | Pri | Task | Depends |
|----|-----|------|---------|
| E0 | P0 | Prod compose Hermes (pinned image, `mem_limit`, pipe-only/no-LLM docs) | — | **DONE in repo** (deploy to server next) |
| E1 | P0 | Phase 1 server probe (blocks adapter code) | E0 |
| E1b | P0 | Phase 2: register test # on Hermes allowlist + `studio_whatsapp_config` | E1 |
| E2 | P1 | `WhatsAppTransport` + module factory | E1 endpoint table |
| E3 | P1 | `WahaProvider` + wire `StudioWhatsAppService` send paths | E2 |
| E4 | P1 | `HermesProvider` from probe table | E1, E2 |
| E5 | P2 | Webhook normalizer (if probe requires) | E1 |
| E6 | P2 | `NotificationDispatcher` transport inject | E2 |
| E7 | P2 | Test suite per diagram above | E3, E4 |
| E9 | P2 | `whatsappTransportHealth` GraphQL (~1500ms) | E2 |
| E10 | P2 | Pending-sale SQL helper + cutover checklist | — |
| E11 | P1 | `cutover-hermes-preflight` (pending > 0 → fail; Hermes unreachable → fail) | E9, E10 |
| E12 | P1 | Admin GraphQL Hermes session status + QR (generalize or parallel to WAHA APIs) | E0, E1 |
| E13 | P1 | Fail-closed webhook HMAC when key set (remove soft-skip; keep explicit local escape hatch if needed) | E1 |
| E14 | P1 | Write Hermes `WHATSAPP_ALLOWED_USERS` from studio owner+allowlist (admin action and/or startup sync); log drift | E0, E1b |

## NOT in scope

- Admin GraphQL Hermes session/QR (Phase 4)
- `sendFile` on transport interface
- Automated alerting
- Cloud API path

## Worktree parallelization

| Step | Modules | Depends on |
|------|---------|------------|
| E0 compose Hermes | `docker-compose.master-production.yml` | — |
| E1 Phase 1 probe | server + `docs/hermes-local.md` | E0 |
| E1b test # allowlists | config + Hermes | E1 |
| E2–E7 middleware transport | `middleware/src/whatsapp/*`, studio, notifications | E1 |
| E9–E11 health + preflight | health resolver, scripts | E2 / E10 |

**Sequential for E0→E1.** After Phase 1: middleware transport (E2–E7) can parallelize with docs/runbook (E10) lightly; E11 waits on both.

## Diagrams to embed in code (implementation)

- `whatsapp-provider.module.ts` — factory choose waha|hermes
- `studio-whatsapp.controller.ts` — HMAC → normalizer → handleWebhook
- `cutover-hermes-preflight` — pending check + transport health

## What already exists

See Step 0 table — reuse `WahaClientService`, webhook HMAC, confirm ladder, sim scenarios, local Hermes compose.

## NOT in scope

- ~~Admin GraphQL Hermes session/QR~~ → **pulled into scope as E12** (T1=C)
- `sendFile` on transport
- Automated PagerDuty/alerting
- Cloud API (TODOS.md D4.5 already)
- Hermes-in-CI
- Hard-block generic `redeploy.sh` on pending rows

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | issues_open | HOLD scope; 3 critical gaps |
| Eng Review | `/plan-eng-review` | Architecture & tests | 1 | issues_open | 7 decisions + 3 OV tensions folded; Phase 1 still gates ship |
| Outside Voice | Claude subagent | Independent 2nd opinion | 1 | issues_found | X1–X3 all → A (gate/preflight, keep scope) |
| Design Review | — | UI/UX | 0 | — | N/A backend transport |
| DX Review | — | DevEx | 0 | — | skipped |

**CODEX:** skipped (CLI not installed)
**CROSS-MODEL:** X1/X2/X3 resolved A/A/A — Phase 1 gate, cutover preflight (pending + reachability), keep GraphQL health field
**VERDICT:** ENG REVIEW COMPLETE — issues_open until Phase 1 server probe. Scope expanded: E12 admin QR, E13 fail-closed HMAC, E14 allowlist sync, E0 mem_limit. No further TODOS.md items from this pass (Cloud API already D4.5).

**UNRESOLVED DECISIONS:**
- Test phone number for Phase 1–2 (ops)
- Exact Hermes pipe-only config (Phase 1 probe output)
