# QA — NS3 console ignores + backlog (D-25/D-31/D-34/D-11)

**Date:** 2026-10-16  
**Branch:** `cursor/ns3-console-backlog-fixes-bf78`  
**Base:** `master` @ `bf20701`  
**Head:** `988a434`

## Verdict

| Area | Gate | Result | Evidence |
|------|------|--------|----------|
| **Build** | middleware + admin | **PASS** | `npm run build` |
| **Backend** | middleware vitest | **PASS** | 1407 passed, 34 skipped |
| **Backend** | admin vitest | **PASS** | 116 passed, 2 skipped |
| **Browser** | Wave 1–4 + f2-2 + f3-1 + d9-deck | **PASS** | 24/24 — `.gstack/qa-reports/ui-wave-gate-24-ns3.log` |
| **Browser** | Route crawl (320 paths, strict console) | **PASS** | 320/320 — `.gstack/qa-reports/ui-wave-4-crawl-ns3-v2.log` |

## Fixes (root cause, not console widening)

| ID | Fix |
|----|-----|
| **D-25** | Migration `20261016170300_tenant_users_individual_fk.sql`; PM owner/assignee/`pmMembers` use `individuals!tenant_users_individual_id_fkey` embed |
| **D-31** | QA bootstrap starts Realtime; `_realtime`/`realtime` schemas; Kong QA routes use host `:4000` + `Host: realtime-dev.supabase-realtime` + `key_in_query` for WS |
| **D-34** | `/admin/agentic-os` static-imports `AgenticOsWorkspace` (no dynamic chunk flake on long crawl) |
| **D-11** | Extended `docs/ops/release-f2-prod-readiness.md` §5 with F3-1 Service Desk + F3-2 usage smoke |

## Console narrow ignores

**None** — `admin/tests/e2e/helpers/console.ts` `NARROW_IGNORE` is empty.

## Re-run commands

```bash
sudo dockerd --storage-driver=vfs &
bash scripts/qa-bootstrap-f1-4-stack.sh
sudo -E env PG_CONTAINER=postgres POSTGRES_DB=nusantarasoft bash scripts/master-production/apply-migrations.sh
# middleware :4001 + admin :3003 (build + start)
D9_QA_MEDIA_DIR=/cursor/stores/self/media ONBOARDING_RATE_LIMIT_MAX=999 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003 \
  npx playwright test tests/e2e/ui-wave-4-admin-route-crawl.spec.ts --project=chromium --workers=1
```

**Overall:** Full gate **PASS**. No deploy.
