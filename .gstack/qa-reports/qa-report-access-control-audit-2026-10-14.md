# QA — Access control audit & GlobalAuthGuard (PR #18)

**Date:** 2026-10-14  
**Branch:** `cursor/access-control-audit-707c`  
**Verdict:** **PASS**

## Stack setup (agent VM)

Partial Supabase + host-run apps (documented for reproducibility):

1. Install Docker; start `dockerd`.
2. `cd /workspace`
3. `sudo docker compose -f docker-compose.yml -f docker-compose.qa-override.yml up -d postgres`
4. One-time DB fixes for this environment: create `_supabase` DB; `ALTER SCHEMA auth OWNER TO supabase_auth_admin`; reassign auth functions; `CREATE SCHEMA graphql_public`.
5. `sudo docker compose -f docker-compose.yml -f docker-compose.qa-override.yml up -d --no-deps --force-recreate auth rest kong` (uses `volumes/api/kong.qa.yml` — Kong → host gateway for auth/rest).
6. Create admin user: GoTrue `POST /auth/v1/admin/users` with service role; credentials `admin@nusantarasoft.local` / `Nusantarasoft123!`.
7. Host middleware: `middleware/.env.local` → `SUPABASE_URL=http://127.0.0.1:8000`, `KASIR_CONSULT_KEY=test-kasir-key-local`; `npm run start:dev` (port 4001).
8. Host admin: `NEXT_PUBLIC_GRAPHQL_URL=http://127.0.0.1:4001/graphql npm run dev -- -p 3003`.
9. Host landing: `landing-page` `npm run dev -- -p 3000`.

Note: MinIO image pull blocked on this VM; media GraphQL auth verified without S3. Full compose parity may use org registry mirror.

## Gates

| Gate | Command / check | Result |
|------|-----------------|--------|
| HTTP E2E | `KASIR_CONSULT_KEY=test-kasir-key-local node middleware/scripts/access-control-e2e.mjs` | **PASS** 24/24 |
| Unauth sample (10 modules + REST upload) | included in E2E | **PASS** |
| Cross-tenant | `aosTasks(tenantId: fake)` with JWT | **PASS** |
| Authorized flows | signIn + blocks/settings/media/AOS | **PASS** (AOS DB tables partial — JWT accepted) |
| `/internal/kasir-consult` | key 200 / no key 401 | **PASS** |
| nginx `/internal` | config scan | **PASS** (no location) |
| Landing public | `GET :3000` | **PASS** 200 |
| Browser smoke | login, dashboard, Virtual Office, Media Library | **PASS** |
| middleware build | `npm run build` | **PASS** |
| middleware auth tests | `npm run test -- src/auth` | **PASS** |
| admin build | `npm run build` | **PASS** |

## Browser artifacts

| File | Step |
|------|------|
| `/cursor/stores/self/media/access-control-e2e-login.png` | Login page |
| `/cursor/stores/self/media/access-control-e2e-admin-dashboard.png` | Post-login dashboard |
| `/cursor/stores/self/media/access-control-e2e-aos.png` | Virtual Office / Agentic OS |
| `/cursor/stores/self/media/access-control-e2e-media.png` | Media library |

## Audit summary (post-fix)

| Severity | Count (actionable backlog) |
|----------|----------------------------|
| Critical | 0 (after #18) |
| High | 3 (tenant binding, prod introspection env, ML network) |
| Medium / Low | see `docs/security/access-control-audit-2026-10-14.md` |

## PO

Do **not** merge/deploy until PO approval.
