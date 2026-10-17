# QA — P2-3 Agent Builder persisted workflows

**Date:** 2026-10-15  
**Branch:** `cursor/p2-3-agent-builder-persist-e1e8`  
**PR:** [#57](https://github.com/nusantarasoft/nusantarasoft-3/pull/57)  
**Verdict:** **PASS**

## Scope

Replace AI Studio Agent Builder client-side mock canvas with tenant-scoped `studio_agent_workflows` + Studio GraphQL; F1-4 **Live** label; palette remains static with explicit demo-path note (audit **MIXED**).

## Stack (this run)

1. `apt install docker.io`; tmux `dockerd`
2. `bash scripts/qa-bootstrap-f1-4-stack.sh`
3. `sg docker -c 'PG_CONTAINER=postgres bash scripts/master-production/apply-migrations.sh'` (incl. `20261015180000_studio_agent_workflows.sql`)
4. `node scripts/init-cms-admin.mjs` (auth user + profile)
5. tmux `middleware` → `npm run start:dev` → **:4001**
6. tmux `admin` → `NEXT_PUBLIC_GRAPHQL_URL=http://127.0.0.1:4001/graphql npm run dev -- -p 3003` → **:3003**

## Results

| Check | Result | Evidence |
|-------|--------|----------|
| Middleware unit tests (service + GraphQL auth) | **PASS** | 5 tests |
| `middleware npm run build` | **PASS** | this run |
| `admin npm run build` (`--legacy-peer-deps`) | **PASS** | this run |
| Playwright `p2-3-agent-builder-fullstack.spec.ts` (no mocks) | **PASS** | 1 passed (~21s) |
| Screenshots | **PASS** | `/cursor/stores/self/media/p2-3-builder-live-label.png`, `p2-3-builder-canvas-saved.png`, `p2-3-builder-test-run.png` |

## Playwright command

```bash
P2_3_QA_MEDIA_DIR=/cursor/stores/self/media MIDDLEWARE_URL=http://127.0.0.1:4001 \
  NEXT_PUBLIC_GRAPHQL_URL=http://127.0.0.1:4001/graphql \
  npx playwright test tests/e2e/p2-3-agent-builder-fullstack.spec.ts --project=chromium
```

## Gate

- **Merge:** await Akbar (PO rule); QA PASS satisfied for P2-3 scope.
- **Deploy:** not in scope.
- **F3-1:** not touched.
