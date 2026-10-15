# QA — F3-1 Service Desk recruit (2026-10-15)

**Branch:** `cursor/f3-1-service-desk-recruit-6620`  
**Head SHA:** `b73ef46`  
**Overall verdict:** **PASS**

## Screenshot index

| State | File | Result |
|-------|------|--------|
| `/admin/recruit` (Kasir + Service Desk) | `/cursor/stores/self/media/f3-1-service-desk-recruit-page.png` | **PASS** |
| VO after Kasir + Service Desk | `/cursor/stores/self/media/f3-1-service-desk-vo-aos-agents.png` | **PASS** |

Stack: Docker Postgres + Auth + Kong (`scripts/qa-bootstrap-f1-4-stack.sh`) + `sudo apply-migrations.sh` + middleware `:4001` + admin `:3003`. **No GraphQL mocks.**

## Verdict table

| Area | Gate | Result | Evidence |
|------|------|--------|----------|
| **Build** | `middleware npm run build` | **PASS** | nest build |
| **Build** | `admin npm run build` | **PASS** | next build |
| **Backend** | `aos-recruit*.spec.ts` | **PASS** | 13 tests |
| **Backend** | Unauth `aosRecruitStatus` | **PASS** | Playwright |
| **Backend** | Cross-tenant scoping | **PASS** | `aos-recruit.graphql.auth.spec.ts` (existing) |
| **Browser** | `f3-1-service-desk-recruit.spec.ts` | **PASS** | 2/2 chromium |
| **Browser** | Screenshots `f3-1-service-desk-*.png` | **PASS** | 2 files |

## Commands run

```bash
bash scripts/qa-bootstrap-f1-4-stack.sh
sudo rm -f /tmp/mig.out && sudo bash -c 'PG_CONTAINER=postgres POSTGRES_DB=nusantarasoft bash scripts/master-production/apply-migrations.sh'
# middleware/.env.local + admin/.env.local (localhost Kong)
# middleware: CAPTCHA_DISABLED=true ONBOARDING_RATE_LIMIT_MAX=999 npm run start:dev
# admin: npm run dev -p 3003
bash scripts/f3-1-browser-qa.sh
cd middleware && npm run test -- src/agentic-os/aos-recruit && npm run build
cd admin && npm run build
```

## Scope / safety

- No merge / deploy from this run.
- Docs: backlog F3-1 **DONE** after this PASS.
