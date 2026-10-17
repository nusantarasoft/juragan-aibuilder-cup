# QA — F3-6 Sales recruit (2026-10-16)

**Branch:** `cursor/f3-6-sales-recruit-88ae`  
**Overall verdict:** **PASS**

## Screenshot index

| State | File | Result |
|-------|------|--------|
| `/admin/recruit` (four live SKUs incl. Sales) | `/cursor/stores/self/media/f3-6-sales-recruit-page.png` | **PASS** |
| `/admin/recruit` after Sales recruited | `/cursor/stores/self/media/f3-6-sales-recruit-after-sales.png` | **PASS** |

Stack: Docker Postgres + Auth + Kong (`scripts/qa-bootstrap-f1-4-stack.sh`) + `apply-migrations.sh` + middleware `:4001` + admin `:3003`. **No GraphQL mocks.**

## Verdict table

| Area | Gate | Result | Evidence |
|------|------|--------|----------|
| **Build** | `middleware npm run build` | **PASS** | nest build |
| **Build** | `admin npm run build` | **PASS** | next build |
| **Backend** | `aos-recruit*.spec.ts` | **PASS** | 19 tests |
| **Browser** | `f3-6-sales-recruit.spec.ts` | **PASS** | 2/2 chromium |
| **Browser** | Screenshots `f3-6-sales-*.png` | **PASS** | 2 files |

## Commands run

```bash
sudo dockerd &  # cloud VM (daemon not pre-started)
bash scripts/qa-bootstrap-f1-4-stack.sh
sudo bash -c 'PG_CONTAINER=postgres POSTGRES_DB=nusantarasoft bash scripts/master-production/apply-migrations.sh'
# middleware/.env.local + admin/.env.local (localhost Kong)
# middleware: CAPTCHA_DISABLED=true ONBOARDING_RATE_LIMIT_MAX=999 npm run start:dev
# admin: npm install --legacy-peer-deps && npm run dev -- --port 3003
cd admin && npx playwright install chromium
bash scripts/f3-6-browser-qa.sh
cd middleware && npm run test -- src/agentic-os/aos-recruit && npm run build
cd admin && npm run build
```

## Scope / safety

- No merge / deploy from this run.
- Docs: backlog F3-6 **DOING** → mark **DONE** after Akbar merge approval.
