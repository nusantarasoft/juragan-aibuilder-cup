# QA — D-9 Adityo VO HUD + Command Deck integration (Wave 4 #74)

**Date:** 2026-10-16  
**Branch:** `cursor/d9-adityo-vo-hud-4c00`  
**PR:** [#75](https://github.com/nusantarasoft/nusantarasoft-3/pull/75)  
**Source:** `development-adityo` @ `861a6588fe93594528f1079b7e58cc624a6550de`  
**Base:** `master` @ `ccdc67a`

## Stack (live GraphQL — no mocks)

1. `docker.io` + `docker-compose-v2`; `sudo dockerd --storage-driver=vfs &`
2. `bash scripts/qa-bootstrap-f1-4-stack.sh` — Postgres, Auth, REST, Kong
3. `PG_CONTAINER=postgres DB_USER=postgres sudo -E bash scripts/master-production/apply-migrations.sh` — 96 migrations, 0 failures
4. Host middleware `:4001` + admin `:3003` (`middleware/.env.local`, `admin/.env.local`)
5. QA flags: `CAPTCHA_DISABLED=true`, `ONBOARDING_RATE_LIMIT_MAX=999`, `WA_OTP_MOCK=true`

## Verdict table

| Area | Gate | Result | Evidence |
|------|------|--------|----------|
| Conflict markers grep | repo | **PASS** | no `<<<<<<<` / `>>>>>>>` |
| **Build** | middleware + admin | **PASS** | `npm run build` |
| **Backend** | middleware vitest (full) | **PASS** | **1407** passed, 34 skipped (115 files) |
| **Backend** | middleware wave subset | **PASS** | crawler service + aos-recruit **27/27** |
| **Backend** | admin vitest (full) | **PASS** | **116** passed, 2 skipped (26 files) |
| **Backend** | admin wave subset | **PASS** | bms/tenantOwner/firstEmployee/recruit + wave4 views + VO lib **25/25** |
| **Browser** | Wave 1–4 + f2-2 + f3-1 + d9-deck | **PASS** | **24/24** chromium (~10.5m) |
| **Browser** | Route crawl (320 paths, strict console) | **FAIL** | **33** routes with console violations (287 ok) — same class as PO #74 |
| **VO HUD screenshots** | wave-1 inspector + d9 VO | **PASS** | `.gstack/qa-reports/screenshots/ui-wave-1-vo-inspector-*-after.png`, `d9-deck-vo-*.png` (2026-10-16 run) |

## Vitest fixes (test drift, not product)

| File | Fix |
|------|-----|
| `studio-web-crawler.worker.spec.ts` | Mock `getJobRow` → `running` (worker now re-reads row before advance) |
| `studio-umkm.cron.unit.spec.ts` | Expect 4th arg `tenant_id` on `sendOutboundText` |
| `admin/tests/unit/auth.unit.spec.ts` | Include `tenant_owner` in `ROLE_LABELS` |

Prior “3 + 1” failures were **unit test drift**, not missing Docker stack.

## Route crawl (33 failures — fix queue, unchanged from #74 theme)

Primary bucket: **GraphQL HTTP 400** on CRM/documents/ecommerce/HR/security routes (schema/query mismatch on QA).  
**VO integration routes:** `/admin/virtual-office` **ok**, `/admin/agentic-os` **ok** (empty console).

Re-run crawl (production admin recommended for stability):

```bash
sudo dockerd --storage-driver=vfs &
bash scripts/qa-bootstrap-f1-4-stack.sh
PG_CONTAINER=postgres DB_USER=postgres sudo -E bash scripts/master-production/apply-migrations.sh
# tmux: middleware npm run start:dev ; admin npm run build && npm run start -- -p 3003
ONBOARDING_RATE_LIMIT_MAX=999 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003 UI_WAVE4_COVERAGE_DIR=/workspace/.gstack/qa-reports \
  npx playwright test tests/e2e/ui-wave-4-admin-route-crawl.spec.ts --project=chromium --workers=1
```

Full browser gate (24 + crawl):

```bash
ONBOARDING_RATE_LIMIT_MAX=999 GRAPHQL_URL=http://127.0.0.1:4001/graphql PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003 \
UI_WAVE4_COVERAGE_DIR=/workspace/.gstack/qa-reports \
UI_WAVE1_MEDIA_DIR=/workspace/.gstack/qa-reports/screenshots \
UI_WAVE2_MEDIA_DIR=/workspace/.gstack/qa-reports/screenshots \
UI_WAVE3_MEDIA_DIR=/workspace/.gstack/qa-reports/screenshots \
F22_MEDIA_DIR=/workspace/.gstack/qa-reports/screenshots \
D9_QA_MEDIA_DIR=/workspace/.gstack/qa-reports/screenshots D9_DOCKER='sudo docker' \
npx playwright test tests/e2e/ui-wave-1-recruit-deeplinks.spec.ts tests/e2e/ui-wave-1-vo-inspector.spec.ts \
  tests/e2e/ui-wave-2-admin-buttons.spec.ts tests/e2e/ui-wave-3-admin-buttons.spec.ts \
  tests/e2e/ui-wave-4-admin-buttons.spec.ts tests/e2e/f2-2-recruit-fullstack.spec.ts \
  tests/e2e/f3-1-service-desk-recruit.spec.ts tests/e2e/d9-deck-fullstack.spec.ts \
  tests/e2e/ui-wave-4-admin-route-crawl.spec.ts --project=chromium --workers=1
```

Logs: `.gstack/qa-reports/d9-vo-playwright.log`, `d9-vo-crawl-retry.log`

## Overall

**Integration + Wave 1–4 + d9 browser gate: PASS.**  
**Strict route crawl: FAIL (33)** — same acceptance bar as [#74](https://github.com/nusantarasoft/nusantarasoft-3/pull/74); not a regression from VO HUD (VO/AOS crawl paths clean).

**No deploy.**
