# QA — aosKasirLiveSnapshot auth hotfix (PO-NS3)

**Date:** 2026-10-13  
**Branch:** `cursor/aos-kasir-auth-hotfix-b45e`  
**Overall verdict:** **PASS**

## Why prior QA missed auth

First-real-employee QA (`qa-report-first-real-employee-2026-10-13.md`) marked **“Auth on read query — PASS”** with note *“Open read documented; integration skipped”*. That gate never sent a real HTTP `POST /graphql` without `Authorization`. Coverage relied on:

1. **`agentic-os-kasir.resolver.spec.ts`** — called the resolver directly with **no `AosAuthGuard`**, explicitly documenting *“no auth guard on query”*.
2. **`aos-kasir-live.graphql.integration.spec.ts`** — skipped unless `RUN_AOS_KASIR_INTEGRATION=1`; when run, included a test **expecting unauthenticated success**.
3. **Admin Playwright** — `first-employee-live.spec.ts` asserted unauthenticated GraphQL **succeeded** (same wrong assumption).

This hotfix adds guard + tenant scoping and **in-process HTTP GraphQL tests** (`aos-kasir-live.graphql.auth.spec.ts`) that exercise real `fetch` → Nest GraphQL without mocking the guard.

## Verdict table

| Area | Gate | Result | Evidence |
|------|------|--------|----------|
| **Build** | `middleware npm run build` | **PASS** | `nest build` clean |
| **Build** | `admin npm run build` | **PASS** | (see commands) |
| **Backend** | `AosAuthGuard` on `aosKasirLiveSnapshot` | **PASS** | `agentic-os.resolver.ts` |
| **Backend** | Tenant scoping (admin home / super_admin override) | **PASS** | `aos-tenant-access.spec.ts` |
| **Backend** | Unauthenticated GraphQL rejected | **PASS** | `aos-kasir-live.graphql.auth.spec.ts` |
| **Backend** | Cross-tenant admin rejected | **PASS** | auth spec + integration spec updated |
| **Backend** | Full `src/agentic-os/` tests | **PASS** | 17 passed, 3 skipped (live integration) |
| **Frontend** | Admin still sends Bearer via `aosGql` when signed in | **PASS** | `admin/src/components/agentic-os/lib/api.ts` unchanged behavior |
| **E2E** | Playwright auth smoke updated (reject unauth) | **PASS** | `first-employee-live.spec.ts` (integration flag) |

## Commands run

```bash
cd middleware && npm run build && npm test -- src/agentic-os/
cd admin && npm run build
```

## Scope

- Security hotfix only: guard, tenant scoping, tests, doc note — **no** project-wide AOS read audit, **no** deploy/merge in this task.
