# QA — F3-8 Security recruit (2026-10-16)

**Branch:** `cursor/f3-8-security-recruit-fdca`  
**Overall verdict:** **PASS**

## Screenshot index

| State | File | Result |
|-------|------|--------|
| `/admin/recruit` (six live SKUs incl. Security) | `/cursor/stores/self/media/f3-8-security-recruit-page.png` | **PASS** |
| `/admin/recruit` after Security recruited | `/cursor/stores/self/media/f3-8-security-recruit-after-security.png` | **PASS** |

Stack: Docker Postgres + Auth + Kong + `apply-migrations.sh` + middleware `:4001` + admin `:3003`. **No GraphQL mocks.**

## Verdict table

| Area | Gate | Result | Evidence |
|------|------|--------|----------|
| **Build** | `middleware npm run build` | **PASS** | nest build |
| **Build** | `admin npm run build` | **PASS** | next build |
| **Backend** | `aos-recruit*.spec.ts` | **PASS** | 25 tests |
| **Browser** | `f3-8-security-recruit.spec.ts` | **PASS** | 2/2 chromium |
| **Browser** | Screenshots `f3-8-security-*.png` | **PASS** | 2 files |

## Commands run

```bash
sudo dockerd &
bash scripts/qa-bootstrap-f1-4-stack.sh
sudo bash -c 'PG_CONTAINER=postgres POSTGRES_DB=nusantarasoft bash scripts/master-production/apply-migrations.sh'
# middleware/.env.local + admin/.env.local (localhost Kong)
# middleware: CAPTCHA_DISABLED=true ONBOARDING_RATE_LIMIT_MAX=999 npm run start:dev
# admin: npm run dev -- --port 3003
cd admin && npx playwright install chromium
bash scripts/f3-8-browser-qa.sh
cd middleware && npm run test -- src/agentic-os/aos-recruit && npm run build
cd admin && npm run build
```

## Scope / safety

- No merge / deploy from this run.
- Docs: backlog F3-7 **DONE**, F3-8 **DOING** → mark **DONE** after Akbar merge approval.
