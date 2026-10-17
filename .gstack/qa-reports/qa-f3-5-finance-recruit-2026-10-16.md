# QA — F3-5 Finance recruit (2026-10-16)

**Branch:** `cursor/f3-5-finance-recruit-a3ed`  
**Head SHA:** `d077cf8` (pre-QA report commit; re-run after any follow-up commits)  
**Overall verdict:** **PASS**

## Screenshot index

| State | File | Result |
|-------|------|--------|
| `/admin/recruit` (Kasir + Service Desk + Finance live) | `/cursor/stores/self/media/f3-5-finance-recruit-page.png` | **PASS** |
| VO after Kasir + Service Desk + Finance | `/cursor/stores/self/media/f3-5-finance-vo-after-finance.png` | **PASS** |

Stack: Docker Postgres + Auth + Kong (`scripts/qa-bootstrap-f1-4-stack.sh`) + `apply-migrations.sh` + middleware `:4001` + admin `:3003`. **No GraphQL mocks.**

## Verdict table

| Area | Gate | Result | Evidence |
|------|------|--------|----------|
| **Build** | `middleware npm run build` | **PASS** | nest build |
| **Build** | `admin npm run build` | **PASS** | next build |
| **Backend** | `aos-recruit*.spec.ts` | **PASS** | 16 tests |
| **Backend** | Unauth `aosRecruitStatus` | **PASS** | Playwright |
| **Browser** | `f3-5-finance-recruit.spec.ts` | **PASS** | 2/2 chromium |
| **Browser** | Screenshots `f3-5-finance-*.png` | **PASS** | 2 files |

## Commands run

```bash
bash scripts/qa-bootstrap-f1-4-stack.sh
sudo bash -c 'PG_CONTAINER=postgres POSTGRES_DB=nusantarasoft bash scripts/master-production/apply-migrations.sh'
# middleware/.env.local + admin/.env.local (localhost Kong)
# middleware: CAPTCHA_DISABLED=true ONBOARDING_RATE_LIMIT_MAX=999 npm run start:dev
# admin: npm run dev
bash scripts/f3-5-browser-qa.sh
cd middleware && npm run test -- src/agentic-os/aos-recruit && npm run build
cd admin && npm run build
```

## Scope / safety

- No merge / deploy from this run.
- Docs: backlog F3-5 **DOING** → mark **DONE** after Akbar merge approval.
