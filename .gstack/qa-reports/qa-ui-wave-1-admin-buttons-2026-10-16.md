# QA — UI Wave 1 (admin buttons & actions)

**Date:** 2026-10-16  
**Branch:** `cursor/ui-wave-1-admin-buttons-bfdf`  
**PR:** [#70](https://github.com/nusantarasoft/nusantarasoft-3/pull/70)  
**Baseline:** `master` @ `35614ab` (post `fd8c4ba` production raise)  
**Overall verdict:** **PASS**

## Stack (live GraphQL — no mocks)

1. Installed `docker.io` on agent VM; started `dockerd` (systemd start blocked by `policy-rc.d`).
2. `bash scripts/qa-bootstrap-f1-4-stack.sh` — Postgres `:5432`, Auth `:9999`, REST `:3002`, Kong `:8000`.
3. `sg docker -c 'PG_CONTAINER=postgres DB_USER=postgres bash scripts/master-production/apply-migrations.sh'` — 94 migrations, 0 failures.
4. Host middleware: `middleware/.env.local` + `npm run start:dev` → `:4001`.
5. Host admin: `admin/.env.local` + `npm run dev` → `:3003`.
6. `node scripts/init-cms-admin.mjs` — `admin@nusantarasoft.local` signIn OK.

QA env flags: `CAPTCHA_DISABLED=true`, `ONBOARDING_RATE_LIMIT_MAX=999`, `WA_OTP_MOCK=true` (middleware `.env.local`).

## Verdict table

| Area | Gate | Result | Evidence |
|------|------|--------|----------|
| **Build** | `middleware npm run build` | **PASS** | nest build |
| **Build** | `admin npm run build` | **PASS** | next build (prior run on branch) |
| **Backend** | `aos-recruit.service.spec.ts` | **PASS** | 24/24 |
| **Backend** | admin vitest (`firstEmployee`, `kasirLive`, `recruitPostSuccessLinks`) | **PASS** | 10/10 |
| **Browser** | `ui-wave-1-recruit-deeplinks.spec.ts` | **PASS** | 2/2 chromium |
| **Browser** | `ui-wave-1-vo-inspector.spec.ts` | **PASS** | 1/1 chromium |
| **Browser** | `f2-2-recruit-fullstack.spec.ts` (updated Kasir → connect-wa) | **PASS** | 2/2 chromium |
| **Browser** | `f3-1-service-desk-recruit.spec.ts` | **PASS** | 2/2 chromium |
| **Browser** | `d9-deck-fullstack.spec.ts` (VO Live/Demo + Command Deck) | **PASS** | 2/2 chromium |
| **Browser** | Wave 1 combined Playwright | **PASS** | **9/9** chromium, ~1.3m |

## Screenshot index (after)

| State | File |
|-------|------|
| VO inspector — Service Desk (queue copy, not Kasir metrics) | `.gstack/qa-reports/screenshots/ui-wave-1-vo-inspector-servicedesk-after.png` |
| VO inspector — Kasir (connect-wa link + Kasir copy) | `.gstack/qa-reports/screenshots/ui-wave-1-vo-inspector-kasir-after.png` |
| Recruit catalog (regression) | `.gstack/qa-reports/screenshots/f2-2-recruit-page.png` |
| VO after Kasir recruit | `.gstack/qa-reports/screenshots/f2-2-vo-kasir-recruited.png` |
| D-9 VO Live / Demo | `.gstack/qa-reports/screenshots/d9-deck-vo-live.png`, `d9-deck-vo-demo.png` |

Before (pre-fix context): `.gstack/qa-reports/screenshots/issue-001-before.png`, `issue-002-before.png`.

## Commands run

```bash
bash scripts/qa-bootstrap-f1-4-stack.sh
sg docker -c 'PG_CONTAINER=postgres DB_USER=postgres bash scripts/master-production/apply-migrations.sh'
# tmux: middleware npm run start:dev ; admin npm run dev
cd middleware && npm run test -- src/agentic-os/aos-recruit.service.spec.ts && npm run build
cd admin && npm test -- src/components/agentic-os/lib/firstEmployee.spec.ts \
  src/app/admin/virtual-office/lib/kasirLive.spec.ts src/lib/recruitPostSuccessLinks.spec.ts
ONBOARDING_RATE_LIMIT_MAX=999 GRAPHQL_URL=http://127.0.0.1:4001/graphql \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003 \
F22_MEDIA_DIR=/workspace/.gstack/qa-reports/screenshots \
UI_WAVE1_MEDIA_DIR=/workspace/.gstack/qa-reports/screenshots \
D9_QA_MEDIA_DIR=/workspace/.gstack/qa-reports/screenshots D9_DOCKER='sudo docker' \
npx playwright test tests/e2e/ui-wave-1-recruit-deeplinks.spec.ts \
  tests/e2e/ui-wave-1-vo-inspector.spec.ts tests/e2e/f2-2-recruit-fullstack.spec.ts \
  tests/e2e/f3-1-service-desk-recruit.spec.ts tests/e2e/d9-deck-fullstack.spec.ts \
  --project=chromium --workers=1
```

## Test fix bundled in QA pass

- `f2-2-recruit-fullstack.spec.ts`: first Kasir recruit expects **`/admin/connect-wa`** (F2-3), then VO; targets Kasir row explicitly (7 recruitable SKUs).

## Scope / safety

- No deploy. PR remains draft until PO squash-merge review.
