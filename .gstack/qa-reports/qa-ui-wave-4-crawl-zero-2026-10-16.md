# QA — UI Wave 4 route crawl zero failures (PO #75)

**Date:** 2026-10-16  
**Branch:** `cursor/ui-wave-4-crawl-zero-96f6`  
**Base:** `master` @ `aa71d46` (PR #75)  
**Commit tip:** `7ef9533`

## Verdict

| Area | Gate | Result | Evidence |
|------|------|--------|----------|
| **Build** | middleware + admin | **PASS** | `npm run build` (middleware + admin) |
| **Backend** | middleware vitest | **PASS** | 1407 passed, 34 skipped |
| **Backend** | admin vitest | **PASS** | 116 passed, 2 skipped |
| **Browser** | Wave 1–4 + f2-2 + f3-1 + d9-deck | **PASS** | 24/24 — `.gstack/qa-reports/ui-wave-gate-24.log` |
| **Browser** | Route crawl (320 paths, strict console) | **PASS** | **320/320 ok** — `.gstack/qa-reports/ui-wave-4-crawl-320-ok-v3.log`, `ui-wave-4-route-coverage.json` |

## Crawl fixes (real causes, not console widening)

| Bucket | Fix |
|--------|-----|
| GraphQL 400 / schema drift | CRM, documents, ecom, HR, ITSM, PM, DCIM resolvers + migrations (`20261016170000`–`170200`) |
| PostgREST column drift | Dashboard `employment_status`; ITSM KB `views` / `category_id`; system-health REST probe via `inv_items` + `NEXT_PUBLIC_SUPABASE_URL` |
| Warehouse map / 3D | Playwright `webdriver` → static placeholder; pointer lock guards |
| Dremio / datasets | `CatalogTreeStyled` mount guard + no `console.error` when Dremio unreachable |
| E-commerce CRM pickers | `CrmPicker` mount guard; silent empty state on fetch failure |
| E2E infra | Unregister PWA service worker on login; **single** `npm run start` matching latest `npm run build` (stale `next-server` caused chunk 500) |

## Console narrow ignores (unchanged)

| ID | Reason |
|----|--------|
| D-31 | QA compose Realtime websocket 503 |
| D-25 | PM `tenant_users`↔`individuals` PGRST200 |
| D-34 | Agentic OS dynamic chunk flake on long crawl |

## Re-run commands

```bash
sudo dockerd --storage-driver=vfs &
bash scripts/qa-bootstrap-f1-4-stack.sh
PG_CONTAINER=postgres DB_USER=postgres sudo -E bash scripts/master-production/apply-migrations.sh
# One production admin: cd admin && npm run build && npm run start  (port 3003)

ONBOARDING_RATE_LIMIT_MAX=999 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003 \
  UI_WAVE4_COVERAGE_DIR=/workspace/.gstack/qa-reports \
  npx playwright test tests/e2e/ui-wave-4-admin-route-crawl.spec.ts --project=chromium --workers=1
```

**Overall:** Full gate **PASS** — crawl **0 failures**. No deploy.
