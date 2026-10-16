# QA — UI Wave 3 (admin buttons & actions)

**Date:** 2026-10-16  
**Branch:** `cursor/ui-wave-3-admin-buttons-f3da`  
**Baseline:** `master` @ `5ebe69c` (Wave 2 squash #72)  
**Overall verdict:** **PASS**

## Stack (live GraphQL — no mocks)

1. `docker.io` + `docker-compose-v2`; `dockerd` on agent VM.
2. `bash scripts/qa-bootstrap-f1-4-stack.sh` — Postgres, Auth, REST, Kong.
3. `PG_CONTAINER=postgres DB_USER=postgres sudo -E bash scripts/master-production/apply-migrations.sh` — 95 migrations, 0 failures (incl. `20261016000000_bms_scada_qa_tenant_seed.sql`).
4. Host middleware + admin (`middleware/.env.local`, `admin/.env.local`) → `:4001` / `:3003`.
5. QA flags: `CAPTCHA_DISABLED=true`, `ONBOARDING_RATE_LIMIT_MAX=999`, `WA_OTP_MOCK=true`.

## Verdict table

| Area | Gate | Result | Evidence |
|------|------|--------|----------|
| **Build** | `middleware npm run build` | **PASS** | nest build |
| **Build** | `admin npm run build` | **PASS** | next build |
| **Backend** | `studio-web-crawler.service.spec.ts` + `aos-recruit.service.spec.ts` | **PASS** | 27/27 |
| **Backend** | admin vitest (`bmsDashboardView`, `tenantOwnerMenu`, `firstEmployee`, `recruitPostSuccessLinks`) | **PASS** | 10/10 |
| **Browser** | Wave 1 + Wave 2 + Wave 3 + f2-2 + f3-1 + d9-deck specs | **PASS** | **21/21** chromium, ~3.1m |

## Wave 3 fixes verified

| Fix | Spec / note |
|-----|-------------|
| D-19 embed Refresh icons wired | `ui-wave-3` MinIO + bulk `title="Refresh page"` |
| D-20 BMS live systems + honesty banners | `ui-wave-3` BMS + updated wave-2 banner assertion |
| SCADA refresh + honesty banners | `ui-wave-3` SCADA overview |
| SCADA trends Export CSV / Auto Refresh | `ui-wave-3` trends spec |
| Navigation Add Item feedback | code (`message.info`) |

## Screenshot index (after)

| State | File |
|-------|------|
| BMS live/sample honesty | `.gstack/qa-reports/screenshots/ui-wave-3-bms-honesty-after.png` |
| Wave 2 regression (AOS/BMS/crawler) | `.gstack/qa-reports/screenshots/ui-wave-2-*-after.png` |

## Commands run

```bash
bash scripts/qa-bootstrap-f1-4-stack.sh
PG_CONTAINER=postgres DB_USER=postgres sudo -E bash scripts/master-production/apply-migrations.sh
# tmux: middleware npm run start:dev ; admin npm run dev -- -p 3003
cd middleware && npm run build && npx vitest run src/studio/studio-web-crawler.service.spec.ts src/agentic-os/aos-recruit.service.spec.ts
cd admin && npm run build && npx vitest run src/lib/bmsDashboardView.spec.ts src/lib/tenantOwnerMenu.spec.ts src/components/agentic-os/lib/firstEmployee.spec.ts src/lib/recruitPostSuccessLinks.spec.ts
npx playwright install chromium
ONBOARDING_RATE_LIMIT_MAX=999 GRAPHQL_URL=http://127.0.0.1:4001/graphql PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003 \
UI_WAVE3_MEDIA_DIR=/workspace/.gstack/qa-reports/screenshots \
UI_WAVE2_MEDIA_DIR=/workspace/.gstack/qa-reports/screenshots UI_WAVE1_MEDIA_DIR=/workspace/.gstack/qa-reports/screenshots \
F22_MEDIA_DIR=/workspace/.gstack/qa-reports/screenshots D9_QA_MEDIA_DIR=/workspace/.gstack/qa-reports/screenshots D9_DOCKER='sudo docker' \
npx playwright test tests/e2e/ui-wave-1-recruit-deeplinks.spec.ts tests/e2e/ui-wave-1-vo-inspector.spec.ts \
  tests/e2e/ui-wave-2-admin-buttons.spec.ts tests/e2e/ui-wave-3-admin-buttons.spec.ts tests/e2e/f2-2-recruit-fullstack.spec.ts \
  tests/e2e/f3-1-service-desk-recruit.spec.ts tests/e2e/d9-deck-fullstack.spec.ts \
  --project=chromium --workers=1
```

## Scope / safety

- No deploy. Backlog **D-19** / **D-20** closed; **D-21** / **D-22** appended (UI-wave-3 follow-ups).
