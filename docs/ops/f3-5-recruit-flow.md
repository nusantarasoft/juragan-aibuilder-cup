# F3-5 — Finance recruit (ops)

**Status:** This PR · **Depends on:** F2-2 `/admin/recruit`, F3-1 Service Desk pattern

## Owner flow

1. Login as `tenant_owner` → `/admin/recruit`.
2. **Kasir UMKM** — first wedge; after recruit → `/admin/connect-wa` (unchanged).
3. **Service Desk** — **Rekrut sekarang** → Virtual Office; optional **Buka antrian tiket** → `/admin/itsm/tickets`.
4. **Finance** — **Rekrut sekarang** → Virtual Office; optional **Buka akuntansi** → `/admin/accounting/dashboard`.
5. CS / Stok / Sales / DevOps / Security / Facilities cards: **Segera hadir**.
6. Trial cap: **3** active agents total (Kasir + Service Desk + Finance fills the cap).

## Safe defaults

- Accounting work: read, query, draft journals and generate report drafts only — **no auto-post** (`requireApproval` includes `journal.post`).
- Tenant isolation: recruit uses session tenant via `tenantForRead` / `resolveAosTenant` (same as F2-2).
- No WA connect required for Finance.

## QA stack

Middleware `:4001`, admin `:3003`, Playwright `admin/tests/e2e/f3-5-finance-recruit.spec.ts`, screenshots `/cursor/stores/self/media/f3-5-finance-*.png`.

**QA-only env:** `CAPTCHA_DISABLED=true`, raise onboarding rate limits when signup-heavy (see [f2-2-recruit-flow.md](f2-2-recruit-flow.md)).
