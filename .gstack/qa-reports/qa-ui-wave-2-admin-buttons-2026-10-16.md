# QA — UI Wave 2 (admin buttons & actions)

**Date:** 2026-10-16  
**Branch:** `cursor/ui-wave-2-admin-buttons-0370`  
**Baseline:** `master` @ `dc8fdd4` (Wave 1 squash #70)  
**Overall verdict:** **PASS**

## Stack (live GraphQL — no mocks)

1. `docker.io` + `docker-compose-v2`; `dockerd` on agent VM.
2. `bash scripts/qa-bootstrap-f1-4-stack.sh` — Postgres, Auth, REST, Kong.
3. `PG_CONTAINER=postgres DB_USER=postgres sudo -E bash scripts/master-production/apply-migrations.sh` — 94 migrations, 0 failures.
4. Host middleware + admin (`middleware/.env.local`, `admin/.env.local`) → `:4001` / `:3003`.
5. QA flags: `CAPTCHA_DISABLED=true`, `ONBOARDING_RATE_LIMIT_MAX=999`, `WA_OTP_MOCK=true`.

## Verdict table

| Area | Gate | Result | Evidence |
|------|------|--------|----------|
| **Build** | `middleware npm run build` | **PASS** | nest build |
| **Build** | `admin npm run build` | **PASS** | next build |
| **Backend** | `studio-web-crawler.service.spec.ts` | **PASS** | 3/3 |
| **Backend** | `aos-recruit.service.spec.ts` | **PASS** | 24/24 |
| **Backend** | admin vitest (`tenantOwnerMenu`, `firstEmployee`, `recruitPostSuccessLinks`) | **PASS** | 8/8 |
| **Browser** | Wave 1 specs (recruit deeplinks, VO inspector, f2-2, f3-1, d9-deck) | **PASS** | 9/9 |
| **Browser** | `ui-wave-2-admin-buttons.spec.ts` | **PASS** | 8/8 chromium |
| **Browser** | Combined Playwright | **PASS** | **17/17** chromium, ~2.7m |

## Wave 2 fixes verified

| Fix | Spec / note |
|-----|-------------|
| D-17 tenant wedge sidebar filter | `tenantOwnerMenu.spec.ts` |
| AOS Settings **UI demo mode** toggle | wave-2 spec |
| Kasir Live badge + connect-wa / usage links | manual via AOS Overview (code) |
| Task **Approve all in review** error path | code + TaskManager |
| Web crawler **Stop** mutation + button | wave-2 crawler spec |
| Label Studio **Open** disabled in demo | wave-2 spec |
| DevOps/Security **Refresh** wired | wave-2 GitLab spec |
| BMS **Sample facility data** banner | wave-2 spec + screenshot |
| Usage **Demo** tag when metrics unavailable | code |

## Screenshot index (after)

| State | File |
|-------|------|
| AOS Settings UI demo toggle | `.gstack/qa-reports/screenshots/ui-wave-2-aos-settings-demo-toggle-after.png` |
| BMS sample-data honesty banner | `.gstack/qa-reports/screenshots/ui-wave-2-bms-sample-banner-after.png` |
| Web Crawler Live + jobs UI | `.gstack/qa-reports/screenshots/ui-wave-2-web-crawler-live-after.png` |
| Wave 1 VO inspector (regression) | `.gstack/qa-reports/screenshots/ui-wave-1-vo-inspector-*-after.png` |

## Commands run

```bash
bash scripts/qa-bootstrap-f1-4-stack.sh
PG_CONTAINER=postgres DB_USER=postgres sudo -E bash scripts/master-production/apply-migrations.sh
# tmux: middleware npm run start:dev ; admin npm run dev -- -p 3003
cd middleware && npm run build && npx vitest run src/studio/studio-web-crawler.service.spec.ts src/agentic-os/aos-recruit.service.spec.ts
cd admin && npm run build && npx vitest run src/lib/tenantOwnerMenu.spec.ts src/components/agentic-os/lib/firstEmployee.spec.ts src/lib/recruitPostSuccessLinks.spec.ts
npx playwright install chromium
ONBOARDING_RATE_LIMIT_MAX=999 GRAPHQL_URL=http://127.0.0.1:4001/graphql PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003 \
UI_WAVE2_MEDIA_DIR=/workspace/.gstack/qa-reports/screenshots \
F22_MEDIA_DIR=/workspace/.gstack/qa-reports/screenshots UI_WAVE1_MEDIA_DIR=/workspace/.gstack/qa-reports/screenshots \
D9_QA_MEDIA_DIR=/workspace/.gstack/qa-reports/screenshots D9_DOCKER='sudo docker' \
npx playwright test tests/e2e/ui-wave-1-recruit-deeplinks.spec.ts tests/e2e/ui-wave-1-vo-inspector.spec.ts \
  tests/e2e/ui-wave-2-admin-buttons.spec.ts tests/e2e/f2-2-recruit-fullstack.spec.ts \
  tests/e2e/f3-1-service-desk-recruit.spec.ts tests/e2e/d9-deck-fullstack.spec.ts \
  --project=chromium --workers=1
```

## Scope / safety

- No deploy. Backlog D-16/D-17 closed; D-19/D-20 appended (UI-wave-2 follow-ups).
