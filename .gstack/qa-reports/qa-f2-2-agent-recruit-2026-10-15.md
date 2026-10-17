# QA — F2-2 agent catalog & recruit (2026-10-15)

**Branch:** `cursor/f2-2-agent-recruit-impl-fea1`  
**Head SHA:** `b7a3ffe`  
**Overall verdict:** **PASS**

## Screenshot index

| State | File | Result |
|-------|------|--------|
| Empty VO CTA | `/cursor/stores/self/media/f2-2-empty-vo-cta.png` | **PASS** |
| `/admin/recruit` catalog | `/cursor/stores/self/media/f2-2-recruit-page.png` | **PASS** |
| Coming soon SKUs | `/cursor/stores/self/media/f2-2-coming-soon-skus.png` | **PASS** |
| VO after Kasir recruit | `/cursor/stores/self/media/f2-2-vo-kasir-recruited.png` | **PASS** |

Stack: Docker (`scripts/qa-bootstrap-f1-4-stack.sh`) + `PG_CONTAINER=postgres bash scripts/master-production/apply-migrations.sh` + middleware `:4001` (`CAPTCHA_DISABLED=true`, `ONBOARDING_RATE_LIMIT_MAX=999` for QA) + admin `:3003`. **No GraphQL mocks.**

## Verdict table

| Area | Gate | Result | Evidence |
|------|------|--------|----------|
| **Build** | `middleware npm run build` | **PASS** | nest build |
| **Build** | `admin npm run build` | **PASS** | next build |
| **Backend** | `aos-recruit*.spec.ts`, `aos-wa-outbound-gate.spec.ts` | **PASS** | 16 tests |
| **Backend** | `onboarding.graphql.auth.spec.ts` (regression) | **PASS** | included |
| **Backend** | Unauth catalog HTTP | **PASS** | Playwright + curl |
| **Browser** | `f2-2-recruit-fullstack.spec.ts` (live GraphQL) | **PASS** | 2/2 chromium |
| **Browser** | Screenshots `f2-2-*.png` | **PASS** | 4 files under `/cursor/stores/self/media/` |

## Commands run

```bash
bash scripts/qa-bootstrap-f1-4-stack.sh
PG_CONTAINER=postgres POSTGRES_DB=nusantarasoft bash scripts/master-production/apply-migrations.sh
# middleware: ONBOARDING_RATE_LIMIT_MAX=999 CAPTCHA_DISABLED=true npm run start:dev
# admin: npm run dev (port 3003)
bash scripts/f2-2-browser-qa.sh
cd middleware && npm run test -- src/agentic-os/aos-recruit && npm run build
cd admin && npm run build
```

## Fix bundled in QA pass

- Register flow: `await refreshSession()` after `storeAuthTokens` so `/admin/*` AuthGate sees the new tenant session (F2-1 regression fix).

## Scope / safety

- No merge / deploy from this run.
- Docs: backlog F2-2 **DONE** only after this PASS.
