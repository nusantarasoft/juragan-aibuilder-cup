# F3-6 — Sales recruit (ops)

**Status:** This PR · **Depends on:** F2-2 `/admin/recruit`, F3-5 Finance pattern

## Owner flow

1. Login as `tenant_owner` → `/admin/recruit`.
2. **Kasir UMKM** — first wedge; after recruit → `/admin/connect-wa` (unchanged).
3. **Service Desk** — **Rekrut sekarang** → Virtual Office; optional **Buka antrian tiket** → `/admin/itsm/tickets`.
4. **Finance** — **Rekrut sekarang** → Virtual Office; optional **Buka akuntansi** → `/admin/accounting/dashboard`.
5. **Sales** — **Rekrut sekarang** → Virtual Office; optional **Buka CRM** → `/admin/crm/dashboard`.
6. CS / Stok / DevOps / Security / Facilities cards: **Segera hadir**.
7. Trial cap: **3** active agents total (any three of the four live SKUs).

## Safe defaults

- CRM work: read, draft lead updates, web research, email **drafts** only — **no auto-send** (`requireApproval` includes `send`).
- Tenant isolation: recruit uses session tenant via `tenantForRead` / `resolveAosTenant` (same as F2-2).
- No WA connect required for Sales.

## QA stack

Middleware `:4001`, admin `:3003`, Playwright `admin/tests/e2e/f3-6-sales-recruit.spec.ts`, screenshots `/cursor/stores/self/media/f3-6-sales-*.png`.

**QA-only env:** `CAPTCHA_DISABLED=true`, raise onboarding rate limits when signup-heavy (see [f2-2-recruit-flow.md](f2-2-recruit-flow.md)).
