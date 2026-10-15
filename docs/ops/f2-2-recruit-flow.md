# F2-2 — Rekrut karyawan (ops)

**Status:** Implemented on `master` (pending merge) · **Depends on:** F2-1 empty VO · **Before:** F2-3 WA connect

## Owner flow

1. Login as `tenant_owner` → empty Virtual Office.
2. CTA **Rekrut karyawan** → `/admin/recruit`.
3. **Rekrut sekarang** on Kasir UMKM → redirect **`/admin/connect-wa`** (F2-3).
4. Kasir appears on Virtual Office floor after recruit (live roster).
5. Other SKUs show **Segera hadir** (not clickable).
6. Trial cap: **3** active agents per tenant.
7. Outbound customer WA (cron/push) blocked until F2-3 owner OTP verified + **Aktifkan** — see [f2-3-connect-wa-flow.md](f2-3-connect-wa-flow.md).

## Platform admin

- Full Agent Studio templates remain visible for `admin` / `super_admin`.
- `tenant_owner` does not see enterprise templates in Agent Studio.

## QA stack

Middleware `:4001`, admin `:3003`, Playwright `admin/tests/e2e/f2-2-recruit-fullstack.spec.ts`, screenshots under `/cursor/stores/self/media/f2-2-*.png`.

**QA-only env:** `CAPTCHA_DISABLED=true`, raise `ONBOARDING_RATE_LIMIT_MAX` / `ONBOARDING_RATE_LIMIT_EMAIL_MAX` when re-running signup-heavy E2E (in-memory limiter resets on middleware restart).

**Register → VO:** after signup, admin calls `refreshSession()` so AuthGate picks up tokens before `/admin/virtual-office`.
