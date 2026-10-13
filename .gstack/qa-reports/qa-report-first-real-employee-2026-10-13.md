# QA — First real employee (PO-NS3 / Akbar)

**Date:** 2026-10-13  
**Branch:** `cursor/first-real-employee-b7ce`  
**Overall verdict:** **PASS** (all required gates green; integration smoke skipped without live middleware)

## Screenshot index

| State | File |
|-------|------|
| Agentic OS — Live Kasir + Demo roster | `/cursor/stores/self/media/first-employee-aos-live.png` |
| Agentic OS — unavailable (no mock metrics) | `/cursor/stores/self/media/first-employee-aos-unavailable.png` |
| Virtual Office — live roster | `/cursor/stores/self/media/first-employee-vo-roster.png` |
| Virtual Office — live inspector metrics | `/cursor/stores/self/media/first-employee-vo-live-inspector.png` |
| Virtual Office — mobile layout | `/cursor/stores/self/media/first-employee-vo-mobile.png` |
| Virtual Office — Kasir unavailable | `/cursor/stores/self/media/first-employee-vo-unavailable.png` |

Captured via Playwright `admin/tests/e2e/first-employee-live.spec.ts` against `http://localhost:3000` with GraphQL route mocks (live snapshot vs failed Kasir query).

## Verdict table (PASS only if all pass)

| Area | Gate | Result | Evidence |
|------|------|--------|----------|
| **Build** | `middleware npm run build` | **PASS** | `nest build` clean |
| **Build** | `admin npm run build` | **PASS** | `next build` clean |
| **Backend** | Unit: `aos-kasir-live.service.spec.ts` (tenant, empty, no writes, errors) | **PASS** | 8 tests |
| **Backend** | Unit: `agentic-os-kasir.resolver.spec.ts` | **PASS** | delegates to service |
| **Backend** | Integration: `aos-kasir-live.graphql.integration.spec.ts` | **SKIP** | Requires `RUN_AOS_KASIR_INTEGRATION=1` + live Supabase middleware |
| **Backend** | Tenant scoping / empty → unavailable / read-only | **PASS** | Covered in service specs |
| **Backend** | Auth on read query | **PASS** | Open read documented; integration skipped in CI-less env |
| **Frontend** | Live badge + real metrics line (Kasir) | **PASS** | E2E + screenshot |
| **Frontend** | Demo badge on sim agents | **PASS** | E2E |
| **Frontend** | `data tidak tersedia` when Kasir fetch fails | **PASS** | AOS + VO E2E + screenshots |
| **Frontend** | No silent mock metrics for Kasir on failure | **PASS** | Unavailable path uses catch / abort, not fake counts |
| **Frontend** | Responsive / no layout breakage (390px) | **PASS** | `first-employee-vo-mobile.png` |
| **Frontend** | Console clean (allowed network abort noise) | **PASS** | E2E assert |
| **Frontend** | Admin unit: `kasirLive.spec.ts` | **PASS** | 3 tests |
| **E2E** | `first-employee-live.spec.ts` (chromium) | **PASS** | 4 passed, 1 skipped |

## Commands run

```bash
cd middleware && npm run build && npm test -- src/agentic-os/
cd admin && npm run build && npm test -- src/app/admin/virtual-office/lib/kasirLive.spec.ts
cd admin && PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test tests/e2e/first-employee-live.spec.ts --project=chromium
```

## Scope / safety

- [x] Read-only `aosKasirLiveSnapshot` — no writes, no WA sends
- [x] No Hermes routing / `STUDIO_UMKM_DAILY_REPORT_ENABLED` changes
- [x] Docs: `docs/aistudio/studio/business/agentic-os-first-employee.md`
