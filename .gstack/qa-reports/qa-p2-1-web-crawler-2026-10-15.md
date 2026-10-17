# QA — P2-1 Web Crawler backend

**Date:** 2026-10-15  
**Branch:** `cursor/p2-1-web-crawler-backend-8674`  
**PR:** [#55](https://github.com/nusantarasoft/nusantarasoft-3/pull/55)  
**Verdict:** **PASS**

## Scope

Replace admin in-memory `webCrawlerService` with persisted `studio_web_crawl_jobs`, middleware worker, tenant-scoped GraphQL (`GlobalAuthGuard`), Live UI labels.

## Stack (this run)

1. `apt install docker.io docker-compose-v2`; start `dockerd`
2. `bash scripts/qa-bootstrap-f1-4-stack.sh`
3. `PATH=/tmp/docker-wrapper:$PATH PG_CONTAINER=postgres bash scripts/master-production/apply-migrations.sh` (incl. `20261015160000_studio_web_crawl_jobs.sql`)
4. `middleware/.env.local` + tmux `npm run start:dev` → **:4001**
5. `NEXT_PUBLIC_GRAPHQL_URL=http://127.0.0.1:4001/graphql npm run dev -- -p 3003` → **:3003**
6. `node scripts/init-cms-admin.mjs` (signIn OK)

## Results

| Check | Result | Evidence |
|-------|--------|----------|
| Middleware unit tests (service, worker, GraphQL auth) | **PASS** | 7 tests |
| `middleware npm run build` | **PASS** | prior run |
| `admin npm run build` | **PASS** | prior run |
| Playwright `p2-1-web-crawler-fullstack.spec.ts` (no mocks) | **PASS** | 1 passed (27.7s) |
| Screenshots | **PASS** | `/cursor/stores/self/media/p2-1-crawler-live-label.png`, `p2-1-crawler-job-list.png` |

## Playwright command

```bash
P2_1_QA_MEDIA_DIR=/cursor/stores/self/media MIDDLEWARE_URL=http://127.0.0.1:4001 \
  npx playwright test tests/e2e/p2-1-web-crawler-fullstack.spec.ts --project=chromium
```

## Gate

- **Merge:** await Akbar (PO rule); QA PASS satisfied for P2-1 backend scope.
- **Deploy:** not in scope for this task.
