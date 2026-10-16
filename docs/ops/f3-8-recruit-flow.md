# F3-8 — Security recruit (ops)

**Status:** This PR · **Depends on:** F2-2 `/admin/recruit`, F3-7 DevOps pattern

## Owner flow

1. Login as `tenant_owner` → `/admin/recruit`.
2. **Kasir UMKM** — first wedge; after recruit → `/admin/connect-wa` (unchanged).
3. **Service Desk** — **Rekrut sekarang** → Virtual Office; optional **Buka antrian tiket** → `/admin/itsm/tickets`.
4. **Finance** — **Rekrut sekarang** → Virtual Office; optional **Buka akuntansi** → `/admin/accounting/dashboard`.
5. **Sales** — **Rekrut sekarang** → Virtual Office; optional **Buka CRM** → `/admin/crm/dashboard`.
6. **DevOps** — **Rekrut sekarang** → Virtual Office; optional **Buka pipeline** → `/admin/devops/pipelines`.
7. **Security** — **Rekrut sekarang** → Virtual Office; optional **Buka assessment keamanan** → `/admin/security/pentest`.
8. CS / Stok / Facilities cards: **Segera hadir**.
9. Trial cap: **3** active agents total (any three of the six live SKUs).

## Safe defaults

- Security work: read modules, draft changes, **ticket.create requests** only — **no auto-remediation** (`requireApproval` includes `ticket.create`, `write`).
- Tenant isolation: recruit uses session tenant via `tenantForRead` / `resolveAosTenant` (same as F2-2).
- No WA connect required for Security.

## QA stack

Middleware `:4001`, admin `:3003`, Playwright `admin/tests/e2e/f3-8-security-recruit.spec.ts`, screenshots `/cursor/stores/self/media/f3-8-security-*.png`.

**QA-only env:** `CAPTCHA_DISABLED=true`, raise onboarding rate limits when signup-heavy (see [f2-2-recruit-flow.md](f2-2-recruit-flow.md)).
