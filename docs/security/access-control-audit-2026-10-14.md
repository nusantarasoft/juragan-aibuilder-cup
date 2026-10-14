# Access control audit — middleware & admin

**Date:** 2026-10-14  
**Branch:** `cursor/access-control-audit-707c`  
**PR:** #18 (secure-by-default + audit)

## Executive summary

| Category | Pre-#18 risk | After #18 |
|----------|--------------|-----------|
| Default GraphQL/REST auth | **Critical** — most resolvers/controllers had no guard | **Mitigated** — `GlobalAuthGuard` (`APP_GUARD`) + `@Public()` / `@AlternativeAuth()` |
| Unauthenticated upload | **Critical** — `POST /studio/upload`, admin `/api/media` | **Fixed** — JWT required; admin route forwards Bearer to GraphQL |
| Agentic OS reads | **Critical** — queries open, client `tenantId` | **Mitigated** — JWT required; tenant binding still **High** follow-up |
| Hermes internal | **Low** — key auth, not on nginx | **Unchanged** (by design) |
| Prod GraphQL introspection | **High** — always on | **Mitigated** — env/`NODE_ENV` gated |
| Admin media client | **High** — GraphQL calls without token | **Fixed** — `mediaService` sends `Authorization` |

## Root-cause groups (not per-endpoint)

### 1. Missing default deny (GraphQL + REST)

**Cause:** Auth only on `studio`, `users`, and AOS mutations; everything else accepted anonymous GraphQL/REST.

**Fix (#18):** `GlobalAuthGuard` registered as `APP_GUARD`. Explicit opt-out: `@Public()` (auth, health), `@AlternativeAuth()` (webhooks, internal kasir, ML backend, legacy WA webhook).

**Remaining:** Service-layer tenant scoping still trusts client-supplied `tenantId` on many modules (CRM, inventory, AOS, ops). **Priority: High** — bind tenant to JWT + membership table.

### 2. Unauthenticated file / media paths

**Cause:** REST upload and Next.js `/api/media` had no Bearer check; GraphQL `createMedia` was reachable without JWT.

**Fix (#18):** Global guard on `POST /studio/upload`; admin `/api/media` requires Bearer; `mediaService` attaches token on GraphQL multipart and JSON.

**Remaining:** Ensure all admin upload UIs use `mediaService` (not legacy direct `/api/media` without headers). **Priority: Medium**.

### 3. Hermes / internal HTTP

**Cause:** N/A — already key-gated.

**State:** `POST /internal/kasir-consult` uses `x-kasir-consult-key`; **not** exposed in `volumes/nginx/nginx.conf`. Docker-internal only.

**Remaining:** Rotate `KASIR_CONSULT_KEY`; keep off nginx. **Priority: Low**.

### 4. Platform & client-side

| Issue | Severity | Notes / fix |
|-------|----------|-------------|
| GraphQL playground/introspection in prod | High | Set `GRAPHQL_INTROSPECTION=false`, `GRAPHQL_PLAYGROUND=false` in production |
| CORS allowlist | Medium | Tighten `CORS_ORIGINS` for prod admin/landing origins |
| Login rate limit | Medium | Nginx `limit_req` on `/graphql`; add app-level throttler on `signIn` |
| Service role in browser | Low | Admin uses anon key only — keep service role server-side |
| Supabase RLS + anon | Medium | Public read on CMS tables; deny anon writes; prefer middleware for mutations |

### 5. Admin Next.js surface

| Route | Guard (after #18) |
|-------|-------------------|
| `POST/DELETE /api/media` | Bearer required |
| `POST /api/chat` | None (mock) — **Low** until real LLM |

No server actions with security impact found.

## Prioritized backlog (post-#18)

1. **High** — Server-side tenant resolution (stop trusting `tenantId` args on AOS/CRM/inventory/ops).
2. **High** — Production env: disable GraphQL introspection/playground; document in ops runbook.
3. **Medium** — `signIn` rate limiting (Nest Throttler or WAF).
4. **Medium** — ML `predict`/`setup`: network isolate + validate Label Studio token (currently `@AlternativeAuth()`).
5. **Low** — Auth `/api/chat` before enabling real provider.

## Verification

- **Automated:** `KASIR_CONSULT_KEY=... node middleware/scripts/access-control-e2e.mjs` — 24 checks (module unauth sample, auth, cross-tenant, internal, nginx, landing, admin).
- **QA stack (agent VM):** `docker compose -f docker-compose.yml -f docker-compose.qa-override.yml` + host-run middleware/admin (see `.gstack/qa-reports/qa-report-access-control-audit-2026-10-14.md`).
- **Registry test:** `middleware/src/auth/access-control-metadata.unit.spec.ts` — `@Public` / `@AlternativeAuth` allowlist.

## Endpoint inventory

Full machine-generated table (943 rows) available via:

`node middleware/scripts/generate-access-control-audit.mjs`

Use the **root-cause groups** above for remediation planning; the flat table is reference only.
