# CEO Review: WAHA → Hermes migration

Plan source: [waha-to-hermes-migration.md](./waha-to-hermes-migration.md) (APPROVED)
Mode: **HOLD SCOPE** | Branch: `master-production` | Date: 2026-08-31

## System architecture (target)

```
                    ┌─────────────────────────────────────┐
                    │         31.97.66.39 (prod)          │
                    │  docker-compose.master-production   │
                    └─────────────────────────────────────┘
  WhatsApp user          │                    │
       │                 │                    │
       ▼                 ▼                    ▼
  ┌─────────┐      ┌──────────┐        ┌─────────────┐
  │ Hermes  │      │ middleware│        │ WAHA (ph 0-2│
  │ Baileys │─────▶│ webhook  │        │  only)      │
  │ bridge  │ HMAC │ Studio   │        └─────────────┘
  └─────────┘ POST └────┬─────┘
                        │
                        ▼
                 StudioUmkmService
                 (unchanged brain)
                        │
                        ▼
                 WhatsAppProvider
                   ├─ WahaProvider (phase 0-2 default)
                   └─ HermesProvider (phase 2+ test #, phase 3 pilot #)
```

## What already exists

| Asset | Reuse |
|-------|--------|
| `WahaClientService` | Wrap in `WahaProvider` — do not rewrite |
| `StudioWhatsAppService` webhook pipeline | Keep; add normalizer if needed |
| `studio-whatsapp.util.ts` | Phone/LID/button parsing |
| `docker-compose.yml` hermes sidecar | Template for prod service |
| `scripts/master-production/redeploy.sh` | Deploy path |
| QA scenarios (`studio-whatsapp-sim.scenario.spec.ts`) | Extend for provider mock |

## Section summaries

| Sec | Result | Key finding |
|-----|--------|-------------|
| 1 Arch | 2 issues | Single hook forward SPOF; only 2 Waha import sites — small blast radius |
| 2 Errors | 4 gaps | Hermes bridge down → silent webhook miss unless logged; HMAC fail → 401 swallowed? |
| 3 Security | 1 WARN | Forwarder must not bypass allowlist; verify Hermes respects same numbers |
| 4 Data/UX | 2 gaps | Duplicate inbound if both providers active on same # (prevented by phase table); cutover mid-pending-sale |
| 5 Quality | OK | Provider factory matches Nest patterns |
| 6 Tests | 3 gaps | No HermesProvider spec; no server integration test; sendList parity test missing |
| 7 Perf | OK | Same volume as WAHA |
| 8 Observ | 1 gap | Add `provider` field to structured webhook logs (in design) |
| 9 Deploy | OK | Phased table + rollback runbook adequate |
| 10 Future | Reversibility **4/5** | Flag + WAHA volume retention |
| 11 Design | SKIPPED | No new UI; admin QR deferred |

## Error & rescue registry (HermesProvider — new)

| Codepath | Failure | Rescued? | User sees | Fix in plan |
|----------|---------|----------|-----------|-------------|
| forward inbound | Hermes bridge down | N | Nothing | Healthcheck + alert on middleware miss |
| forward inbound | HMAC mismatch | Y | 401 logged | Sign in hook |
| sendText | HTTP 5xx | Partial | "Maaf…" via existing catch | Retry 1x like WAHA |
| sendList | Unsupported | Y | sendText fallback | Already in StudioWhatsAppService |
| downloadMedia | Missing endpoint | N | Media skipped | Map in Phase 1 probe |

## Failure modes — CRITICAL GAPs

| Codepath | Failure | RESCUED? | TEST? | USER SEES? |
|----------|---------|----------|-------|------------|
| Phase 1 probe | Pipe-only not verified | — | N | Agent reply on kasir ← **CRITICAL** |
| Phase 2 | sendList tap shape differs | Partial | N | Confirm broken ← **CRITICAL** |
| Cutover | Pending sale in flight | N | N | Double/ch lost sale ← **WARNING** |

## Implementation tasks

- [ ] **T1 (P1, human: ~4h / CC: ~30min)** — Infra — Add Hermes to `docker-compose.master-production.yml` + pinned image
  - Surfaced by: Deploy §9 — prod compose missing hermes
  - Files: `docker-compose.master-production.yml`, `.env.master-production.example`
  - Verify: `docker compose ps hermes` on server

- [ ] **T2 (P1, human: ~2h / CC: ~20min)** — Hermes — Phase 1 server probe (pipe-only, HMAC, payload, sendList)
  - Surfaced by: Failure modes CRITICAL — blocks all adapter work
  - Files: `docs/hermes-local.md`, `volumes/hermes/` on server
  - Verify: one inbound → middleware log, zero agent reply

- [ ] **T3 (P1, human: ~1d / CC: ~1h)** — Middleware — `WhatsAppProviderModule` + WahaProvider + HermesProvider
  - Surfaced by: Arch §1 — decouple transport
  - Files: `middleware/src/whatsapp/*`, `studio-whatsapp.service.ts`, `notification.dispatcher.ts`
  - Verify: unit specs + sim scenario green

- [ ] **T4 (P2, human: ~4h / CC: ~30min)** — Middleware — `hermes-to-waha-webhook.normalizer.ts` if probe requires
  - Surfaced by: Data §4 — payload shape
  - Verify: webhook controller spec with Hermes fixture

- [ ] **T5 (P2, human: ~2h / CC: ~15min)** — Ops — Phase 3 cutover + rollback drill on server
  - Surfaced by: Deploy §9
  - Verify: rollback runbook <30 min

## NOT in scope (deferred)

- WhatsApp Cloud API (TODOS.md existing item)
- Admin GraphQL Hermes session/QR (Phase 4)
- Hermes agent features on prod number
- Automated alerting (manual logs only)

## Dream state delta (12 months)

| Today | After this plan | Ideal |
|-------|-----------------|-------|
| WAHA-only transport | Hermes transport, same middleware brain | Cloud API option + provider interface supports both |
| Manual WAHA patches (`waha-patch-lid-id.js`) | Hermes bridge updates via image pin | Official API, no unofficial ban risk |
| Single prod number fragile | Documented rollback | Blue/green WhatsApp with zero-downtime pairing |

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | issues_open | HOLD scope; 3 critical gaps; Approach B approved |
| Eng Review | `/plan-eng-review` | Architecture & tests | 0 | — | required next |
| Outside Voice | — | — | 0 | skipped | not run |

**VERDICT:** CEO REVIEW COMPLETE — 3 critical gaps (Phase 1 probe, sendList parity, pending-sale cutover guard). Eng review required before ship.

**UNRESOLVED DECISIONS:**
- Test phone number for Phase 1–2 Hermes QA (not documented in repo)
- Exact Hermes pipe-only config (pending Phase 1 server probe)
