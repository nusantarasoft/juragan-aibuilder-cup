# QA — P2-4 Label Studio dashboard (real API)

**Date:** 2026-10-15  
**Branch:** `cursor/p2-4-label-studio-stats-49a1`  
**Verdict:** **PASS**

## Scope

Replace admin Label Studio static `PROJECTS` / `RECENT` mocks with `studioLabelStudioDashboard` GraphQL (middleware proxies Label Studio `/api/projects/` + tenant-scoped `media_annotations` recent rows). F1-4 **Live** / **Demo** via `aos_settings.ui_demo_mode`.

## Stack (this run)

1. `apt install docker.io docker-compose-v2`; tmux `dockerd`
2. `bash scripts/qa-bootstrap-f1-4-stack.sh`
3. `PATH=/tmp/docker-wrapper:$PATH PG_CONTAINER=postgres bash scripts/master-production/apply-migrations.sh`
4. Label Studio: `docker compose -f docker-compose.full.yml up -d labelstudio`; enable org `legacy_api_tokens_enabled` for LS 1.23 token auth; create project **P2-4 QA Project**
5. `middleware/.env.local`: `LABELSTUDIO_URL=http://127.0.0.1:8080`, `LABELSTUDIO_API_TOKEN=<legacy user token>`
6. tmux `middleware` → `npm run start:dev` → **:4001**
7. `node scripts/init-cms-admin.mjs`
8. tmux `admin` → `NEXT_PUBLIC_GRAPHQL_URL=http://127.0.0.1:4001/graphql npm run dev -- -p 3003` → **:3003**

## Results

| Check | Result | Evidence |
|-------|--------|----------|
| Middleware unit tests (service + GraphQL auth) | **PASS** | 5 tests (`studio-label-studio.*.spec.ts`) |
| `middleware npm run build` | **PASS** | this run |
| `admin npm run build` (`--legacy-peer-deps`) | **PASS** | this run |
| Playwright `p2-4-label-studio-fullstack.spec.ts` (no mocks) | **PASS** | 1 passed (18.4s) |
| Screenshots | **PASS** | `/cursor/stores/self/media/p2-4-label-studio-live-label.png`, `p2-4-label-studio-project-stats.png`, `p2-4-label-studio-recent.png` |

## Playwright command

```bash
P2_4_QA_MEDIA_DIR=/cursor/stores/self/media P2_4_DOCKER='sudo docker' MIDDLEWARE_URL=http://127.0.0.1:4001 \
  NEXT_PUBLIC_GRAPHQL_URL=http://127.0.0.1:4001/graphql \
  npx playwright test tests/e2e/p2-4-label-studio-fullstack.spec.ts --project=chromium
```

## Gate

- **Merge:** await Akbar (PO rule); QA PASS satisfied for P2-4 scope.
- **Deploy:** not in scope.
- **F3-1:** not touched.
