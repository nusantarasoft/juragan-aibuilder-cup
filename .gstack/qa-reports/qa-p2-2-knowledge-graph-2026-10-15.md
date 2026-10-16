# QA — P2-2 Knowledge Graph backend

**Date:** 2026-10-15  
**Branch:** `cursor/p2-2-knowledge-graph-9e82`  
**PR:** [#56](https://github.com/nusantarasoft/nusantarasoft-3/pull/56)  
**Verdict:** **PASS**

## Scope

Replace admin mock Knowledge Graph tree with tenant-scoped Postgres RPCs + middleware GraphQL (`GlobalAuthGuard`), Live UI (Demo only when `aos_settings.ui_demo_mode`).

## Stack (this run)

1. `apt install docker.io`; start `dockerd`
2. `bash scripts/qa-bootstrap-f1-4-stack.sh` (postgres, auth, rest, kong)
3. Apply studio + AOS + `20261015000000_aos_task_queue_live.sql` + `20261015170000_studio_knowledge_graph_rpc.sql` via `sudo docker exec`
4. `middleware/.env.local` + tmux `npm run start:dev` → **:4001**
5. `NEXT_PUBLIC_GRAPHQL_URL=http://127.0.0.1:4001/graphql npm run dev -- -p 3003` → **:3003**
6. Auth user present (`admin@nusantarasoft.local`)

## Results

| Check | Result | Evidence |
|-------|--------|----------|
| Middleware unit tests (service, GraphQL auth) | **PASS** | 7 tests |
| `middleware npm run build` | **PASS** | nest build |
| `admin npm run build` | **PASS** | next build |
| Playwright `p2-2-knowledge-graph-fullstack.spec.ts` (no mocks) | **PASS** | 1 passed (21.4s) |
| Screenshots | **PASS** | `/cursor/stores/bc-ffbd38c7-e468-5c00-9d54-d4915a5f658f/media/p2-2-kg-live-label.png`, `p2-2-kg-tree.png`, `p2-2-kg-chunk-inspector.png` |

## Playwright command

```bash
P2_2_QA_MEDIA_DIR=/cursor/stores/bc-ffbd38c7-e468-5c00-9d54-d4915a5f658f/media MIDDLEWARE_URL=http://127.0.0.1:4001 \
  P2_2_DOCKER='sudo docker' npx playwright test tests/e2e/p2-2-knowledge-graph-fullstack.spec.ts --project=chromium
```

## Gate

- **Merge:** await PO QA gate / Akbar; QA PASS satisfied for P2-2 scope.
- **Deploy:** not in scope.
