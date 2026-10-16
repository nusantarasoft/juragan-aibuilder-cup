# QA P2-5 — Dedicated WhatsApp per store

**Date:** 2026-10-15 (full gate re-run)  
**Branch:** `cursor/p2-5-dedicated-wa-c20f`  
**PR:** [#59](https://github.com/nusantarasoft/nusantarasoft-3/pull/59)  
**Scope:** Per-tenant optional dedicated WA session mapping, connect-wa UI, routing, fail-closed gates.

## Verdict: **PASS**

| Check | Result | Evidence |
|-------|--------|----------|
| Docker QA bootstrap | **PASS** | `scripts/qa-bootstrap-f1-4-stack.sh` |
| Migrations (incl. P2-5) | **PASS** | `PG_CONTAINER=postgres bash scripts/master-production/apply-migrations.sh` — 94 tracked, 0 failures |
| Middleware `:4001` | **PASS** | `WA_OTP_MOCK=true`, `WA_DEDICATED_PAIR_MOCK=1`, `CAPTCHA_DISABLED=true`, `NODE_ENV=development` |
| Admin `:3003` | **PASS** | `NEXT_PUBLIC_GRAPHQL_URL=http://127.0.0.1:4001/graphql` |
| Vitest (dedicated + routing) | **PASS** | 45 tests (prior run + `nest build`) |
| Playwright `p2-5-dedicated-wa-fullstack.spec.ts` | **PASS** | 2/2 (~15s), live GraphQL, no route mocks |
| Screenshots | **PASS** | `/cursor/stores/self/media/p2-5-dedicated-wa-*.png` (4 files) |

## Stack (this run)

1. `apt install docker.io`; tmux `dockerd`
2. `bash scripts/qa-bootstrap-f1-4-stack.sh`
3. `chmod 666 /var/run/docker.sock`; `PG_CONTAINER=postgres bash scripts/master-production/apply-migrations.sh`
4. `node scripts/init-cms-admin.mjs`
5. tmux `middleware-dev` → `npm run start:dev` with `.env.local` (mock OTP + dedicated pair)
6. tmux `admin-dev` → dev server **:3003**

## Playwright command

```bash
P2_5_QA_MEDIA_DIR=/cursor/stores/self/media \
MIDDLEWARE_URL=http://127.0.0.1:4001 \
GRAPHQL_URL=http://127.0.0.1:4001/graphql \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003 \
npx playwright test tests/e2e/p2-5-dedicated-wa-fullstack.spec.ts --project=chromium
```

## Screenshots

| File | State |
|------|--------|
| `p2-5-dedicated-wa-connect-entry.png` | Post-recruit connect wizard |
| `p2-5-dedicated-wa-connect-section.png` | Dedicated section + Demo banner |
| `p2-5-dedicated-wa-opt-in.png` | After opt-in dedicated |
| `p2-5-dedicated-wa-mock-paired.png` | After mock pair (`WA_DEDICATED_PAIR_MOCK=1`) |

## Notes

- Demo pairing uses documented `WA_DEDICATED_PAIR_MOCK=1` (Hermes QR not required for QA PASS).
- Live tenant QR remains `WA_TENANT_DEDICATED_PAIR=1` + Hermes deploy (ops).
