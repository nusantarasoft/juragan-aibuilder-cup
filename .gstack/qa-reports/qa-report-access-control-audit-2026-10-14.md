# QA — Access control audit & GlobalAuthGuard

**Date:** 2026-10-14  
**Branch:** `cursor/access-control-audit-707c`  
**Audit:** [docs/security/access-control-audit-2026-10-14.md](../../docs/security/access-control-audit-2026-10-14.md)

## Verdict

**PASS (build + unit gates)** — live HTTP e2e deferred unless middleware stack is up (`ACCESS_CONTROL_E2E=1`).

## Audit severity summary (inventory rows)

| Severity | Count |
|----------|------:|
| Critical | 0 |
| High | 3 |
| Medium | 933 |
| Low | 7 |

Remaining High: prod GraphQL introspection if env mis-set; Label Studio ML `predict`/`setup` (`@AlternativeAuth`); CMS anon RLS read policies.

## Gates

| Gate | Result |
|------|--------|
| `middleware` `npm run build` | PASS |
| `middleware` `npm run test -- src/auth` | PASS (52 tests) |
| `admin` `npm run build` | PASS |
| HTTP e2e unauth/cross-tenant | SKIP (no `MIDDLEWARE_URL` + DB in CI agent VM) |
| Browser smoke admin login + AOS/VO | SKIP (no deployed env in agent VM) |

## Framework changes verified by tests

- `APP_GUARD` → `GlobalAuthGuard` registered in `AuthModule`
- `@Public()` / `@AlternativeAuth()` allowlist synced via `access-control-metadata.unit.spec.ts`
- GraphQL playground/introspection gated by env in `app.module.ts`
- `POST /studio/upload` requires Bearer JWT (global guard)
- Admin `POST/DELETE /api/media` returns 401 without `Authorization`

## PO note

Do **not** merge/deploy until PO approval. Hermes `/internal/kasir-consult` unchanged (key auth + `@AlternativeAuth()`).
