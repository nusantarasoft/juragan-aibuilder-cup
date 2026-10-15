# F3-1 — Service Desk recruit (ops)

**Status:** Draft PR · **Depends on:** F2-2 `/admin/recruit`, F2-3 for Kasir WA only

## Owner flow

1. Login as `tenant_owner` → `/admin/recruit`.
2. **Kasir UMKM** — first wedge; after recruit → `/admin/connect-wa` (unchanged).
3. **Service Desk** — **Rekrut sekarang** → agent on Virtual Office + Agentic OS roster; optional **Buka antrian tiket** → `/admin/itsm/tickets`.
4. CS / Stok cards: **Segera hadir**.
5. Trial cap: **3** active agents total (Kasir + Service Desk + one more slot).

## Safe defaults

- Ticket work: draft comments and KB search only; **no auto-close** (`requireApproval` includes `ticket.close`).
- Tenant isolation: recruit uses session tenant via `tenantForRead` / `resolveAosTenant` (same as F2-2).
- No WA connect required for Service Desk.

## QA stack

Middleware `:4001`, admin `:3003`, Playwright `admin/tests/e2e/f3-1-service-desk-recruit.spec.ts`, screenshots `/cursor/stores/self/media/f3-1-service-desk-*.png`.

**QA-only env:** `CAPTCHA_DISABLED=true`, raise onboarding rate limits when signup-heavy (see [f2-2-recruit-flow.md](f2-2-recruit-flow.md)).
