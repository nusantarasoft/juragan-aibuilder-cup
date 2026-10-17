# F3-7 — DevOps recruit (ops)

**Status:** This PR · **Depends on:** F2-2 `/admin/recruit`, F3-6 Sales pattern

## Owner flow

1. Login as `tenant_owner` → `/admin/recruit`.
2. **Kasir UMKM** — first wedge; after recruit → `/admin/connect-wa` (unchanged).
3. **Service Desk** — **Rekrut sekarang** → Virtual Office; optional **Buka antrian tiket** → `/admin/itsm/tickets`.
4. **Finance** — **Rekrut sekarang** → Virtual Office; optional **Buka akuntansi** → `/admin/accounting/dashboard`.
5. **Sales** — **Rekrut sekarang** → Virtual Office; optional **Buka CRM** → `/admin/crm/dashboard`.
6. **DevOps** — **Rekrut sekarang** → Virtual Office; optional **Buka pipeline** → `/admin/devops/pipelines`.
7. CS / Stok / Security / Facilities cards: **Segera hadir**.
8. Trial cap: **3** active agents total (any three of the five live SKUs).

## Safe defaults

- DevOps work: read modules, draft changes, pipeline/runbook **requests** only — **no auto-deploy** (`requireApproval` includes `pipeline.trigger`, `runbook.execute`, `deploy`).
- Tenant isolation: recruit uses session tenant via `tenantForRead` / `resolveAosTenant` (same as F2-2).
- No WA connect required for DevOps.

## QA stack

Middleware `:4001`, admin `:3003`, Playwright `admin/tests/e2e/f3-7-devops-recruit.spec.ts`, screenshots `/cursor/stores/self/media/f3-7-devops-*.png`.

**QA-only env:** `CAPTCHA_DISABLED=true`, raise onboarding rate limits when signup-heavy (see [f2-2-recruit-flow.md](f2-2-recruit-flow.md)).
