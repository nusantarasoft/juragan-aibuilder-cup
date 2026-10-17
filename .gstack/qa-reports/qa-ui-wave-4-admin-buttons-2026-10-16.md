# QA — UI Wave 4 (admin buttons & actions) — PO #74 console gate

**Date:** 2026-10-16  
**Branch:** `cursor/ui-wave-4-admin-buttons-f484`  
**PR:** [#74](https://github.com/nusantarasoft/nusantarasoft-3/pull/74)

## Console gate (PO #74)

`admin/tests/e2e/helpers/console.ts` no longer blanket-ignores runtime crashes, HTTP 400, or PM noise.

| Policy | Implementation |
|--------|----------------|
| Removed | `Cannot read properties of (undefined\|null)`, blanket `400/401/503`, `PM Error`, `agentic-os_lib`, `PGRST*` blanket |
| Fixed in code | PM `me` without `fullName`; accounting analytics → `accountingService`; CMS stars authed `gql`; system-health admin probe uses `window.location.origin`; warehouse layout API silent fallback; PM PostgREST embeds simplified; Supabase realtime off unless `NEXT_PUBLIC_SUPABASE_REALTIME_ENABLED=true` |
| Narrow ignores (backlog ID + comment in code) | D-24 HR `hr_*` PGRST205; D-25 PM tenant_users↔individuals PGRST200; D-26 QA Realtime websocket 503; D-27 ecom PGRST205; D-28 storage bucket 401; D-29 agentic-os chunk flake; D-30 inventory PGRST205 |

## Verdict table

| Area | Gate | Result | Evidence |
|------|------|--------|----------|
| **Build** | middleware + admin | **PASS** | `npm run build` |
| **Backend** | vitest 27 + admin 16 | **PASS** | same commands as Wave 4 report |
| **Browser** | Wave 1–4 + f2-2 + f3-1 + d9-deck **excluding crawl** | **PASS** | **24/24** (~2m) |
| **Browser** | Route crawl (320 paths, strict console) | **FAIL** | **36** routes with console violations (see below); progress log `.gstack/qa-reports/ui-wave-4-crawl-progress.log` |

## Route crawl — primary click skipped (sample; full JSON has `clickSkipReasons[]`)

Crawl records per-button `{ index, label, error }` in `ui-wave-4-route-coverage.json`. Typical reasons: **primary obscured/timeout** (modal, drawer, canvas, or animation), not dead routes.

| Route | Primary label | Reason |
|-------|---------------|--------|
| `/admin/accounting/accounts` | Virtual Office | Click timeout — overlay / competing primary in layout |
| `/admin/dashboard` | (varies) | Timeout — hero/animation layer |
| `/admin/inventory/warehouse-map` | (3D toolbar) | Canvas / WebGL intercept |
| `/admin/itsm/tickets` | Create / action | Drawer or table header intercept |
| `/admin/pm/backlog` | Quick create | Modal focus trap |
| `/admin/reports` | Export | Dropdown / extra click target |
| `/admin/users/list` | Add user | Modal |

**Count:** 74 routes logged at least one skip on last full crawl (320 paths). PO shortlist “15 routes”: use the **first 15 rows** in coverage JSON where `clickSkipReasons` is non-empty (sorted by path).

## Crawl console failures (36 — fix queue)

Categories after strict gate (2026-10-16):

1. **GraphQL validation HTTP 400** — wrong field names or args (CRM `account` on `Deal`, documents/DCIM/ecom/HR/ITSM/notification queries vs middleware schema). Partial fixes: CRM `name` not `dealName`; executive `acctDashboard` / `itsmDashboardStats`; accounting budget/bank/cash-flow stubs; `pmMembers` stub.
2. **PGRST205** — inventory HR-adjacent tables on QA (D-30 narrow ignore for `inv_*` where fixed in code path).
3. **`/admin/inventory/warehouse-map`** — `PointerLockControls` / canvas lifecycle (`addEventListener` on null) — guard added; still under watch.
4. **`/admin/ops/system-health`** — Kong storage 401 (D-28 narrow ignore until service JWT proxy).

Re-run after next schema/query pass:

```bash
ONBOARDING_RATE_LIMIT_MAX=999 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003 UI_WAVE4_COVERAGE_DIR=/workspace/.gstack/qa-reports \
  npx playwright test tests/e2e/ui-wave-4-admin-route-crawl.spec.ts --project=chromium --workers=1
```

Full gate (24 + crawl):

```bash
# … same env as Wave 4 report …
npx playwright test tests/e2e/ui-wave-1-recruit-deeplinks.spec.ts … tests/e2e/d9-deck-fullstack.spec.ts \
  tests/e2e/ui-wave-4-admin-route-crawl.spec.ts --project=chromium --workers=1
```

## Docs

- `docs/backlog.md` — D-25 done; D-26…D-30 narrow-ignore / follow-ups

**Overall PO #74:** console helper **done**; runtime fixes **partial**; crawl gate **not accepted yet** (36 remaining).
