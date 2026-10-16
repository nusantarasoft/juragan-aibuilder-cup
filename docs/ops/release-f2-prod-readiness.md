# F2 release — Production readiness (F2-1 + F2-2 + F2-3)

**Status:** Ops runbook · **Backlog:** F2-1 / F2-2 / F2-3 · **Owner:** PO-NS3  
**Updated:** 2026-10-15  
**Scope:** Single pre-deploy / post-migrate checklist for tenant self-serve onboarding, Kasir recruit, and shared-inbox WA connect. **Do not deploy** until Akbar approves and this checklist is green.

**Code gate:** `master` at or after **`d0ec587`** (F2-3 [#48](https://github.com/nusantarasoft/nusantarasoft-3/pull/48)), which includes F2-2 @ `144a8ad` ([#46](https://github.com/nusantarasoft/nusantarasoft-3/pull/46)) and F2-1 @ `e6424f2` ([#42](https://github.com/nusantarasoft/nusantarasoft-3/pull/42)).

Component runbooks (detail, not duplicate here): [f2-1-prod-readiness.md](f2-1-prod-readiness.md), [f2-2-recruit-flow.md](f2-2-recruit-flow.md), [f2-3-connect-wa-flow.md](f2-3-connect-wa-flow.md), [f2-4-tenant-agent-settings.md](f2-4-tenant-agent-settings.md) (after F2-4 ships).

Design locks: [f2-1-tenant-onboarding.md](../design/f2-1-tenant-onboarding.md), [f2-2-agent-catalog-recruit.md](../design/f2-2-agent-catalog-recruit.md), [f2-3-tenant-wa-connection.md](../design/f2-3-tenant-wa-connection.md), [f2-4-tenant-settings.md](../design/f2-4-tenant-settings.md) ([#50](https://github.com/nusantarasoft/nusantarasoft-3/pull/50)).

Deploy gate (separate approval): [docs/deploy-master-production.md](../deploy-master-production.md).

---

## 1. Pre-flight

| # | Check | Pass criteria |
|---|--------|----------------|
| 1 | Code on target branch | `master` ≥ `d0ec587` (F2-1 + F2-2 + F2-3) |
| 2 | DB migrations | All files in §3 applied on prod Postgres (in order) |
| 3 | Middleware env | Captcha + WA OTP (§2) — **`nsoft3-middleware` must start** (fail-closed) |
| 4 | Auth env | Real SMTP; **`ENABLE_EMAIL_AUTOCONFIRM=false`** (§2) |
| 5 | Hermes / shared WA | Platform admin: shared inbox paired at `/admin/ai-studio/ai-gateway` (tenants do **not** QR-pair) |
| 6 | Legacy Klontong | Post-migrate alias + store rows (§4) |
| 7 | Smoke | §5 green on staging or approved prod window |

---

## 2. Environment variables

### 2.1 Middleware — onboarding captcha (F2-1, startup fail-closed)

`CaptchaService.onModuleInit()` → `assertOnboardingProductionConfig()` when `NODE_ENV=production`.

| Variable | Required in prod | Notes |
|----------|------------------|--------|
| `TURNSTILE_SECRET_KEY` **or** `HCAPTCHA_SECRET` | At least one non-empty | Server-side verify for `/register` |
| `TURNSTILE_SITE_KEY` or `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | If using Turnstile widget | Exposed via GraphQL `onboardingCaptchaConfig.siteKey` |
| `ONBOARDING_RATE_LIMIT_MAX` | Optional (default `5`) | Per IP / window |
| `ONBOARDING_RATE_LIMIT_WINDOW_MS` | Optional (default `3600000`) | |
| `ONBOARDING_RATE_LIMIT_EMAIL_MAX` | Optional (default `3`) | Per email / window |
| `ONBOARDING_WA_PROVISION_MAX_PER_PHONE_DAY` | Optional (default `2`) | WA DAFTAR path |

**Forbidden in production** (middleware will not start): `CAPTCHA_DISABLED=true`, `ONBOARDING_ALLOW_DEV_CAPTCHA=true`, `ONBOARDING_CAPTCHA_SECRET=f2-1-dev-captcha`.

Reference: `middleware/src/onboarding/onboarding-env.ts`, `middleware/.env.local.example`.

Full tables: [f2-1-prod-readiness.md §2](f2-1-prod-readiness.md).

### 2.2 Middleware — WA owner OTP (F2-3, startup fail-closed)

`WaOtpService.onModuleInit()` → `assertWaOtpProductionConfig()` when `NODE_ENV=production`.

| Variable | Production | Notes |
|----------|------------|--------|
| `WA_OTP_SECRET` | **Required** (non-empty, not `f2-3-dev-wa-otp`) | HMAC pepper for pending OTP hashes |
| `WA_OTP_MOCK` | **Must be unset / false** | QA only — returns `mockCode`, skips Hermes |

Production OTP is sent **to owner phone only** via shared Hermes line (`WaOtpOutboundService`).

Reference: [f2-3-connect-wa-flow.md § Env](f2-3-connect-wa-flow.md).

### 2.3 Host / GoTrue — email verification (F2-1)

| Variable | Production value |
|----------|------------------|
| `ENABLE_EMAIL_SIGNUP` | `true` |
| `ENABLE_EMAIL_AUTOCONFIRM` | **`false`** |
| `SMTP_*`, `SITE_URL`, `ADDITIONAL_REDIRECT_URLS` | Real relay + admin URLs |

After auth mail changes: restart **`nsoft3-auth`**. Template: `.env.master-production.example`.

Full table: [f2-1-prod-readiness.md §3](f2-1-prod-readiness.md).

### 2.4 F2-2

No new production env vars. Trial recruit cap is server constant `TRIAL_MAX_RECRUITED_AGENTS = 3` (`middleware/src/agentic-os/aos-recruit.catalog.ts`).

---

## 3. Database migrations (apply in this order)

Apply via standard app migration step in `redeploy.sh` after images include F2 code.

| Order | File | Purpose |
|-------|------|---------|
| 1 | `20261015000000_aos_task_queue_live.sql` | AOS live task queue + `aos_settings.ui_demo_mode` |
| 2 | `20261015120000_aos_umkm_kasir_agent_f1_3.sql` | Kasir agent seed / F1-3 alignment |
| 3 | `20261015120000_f2_1_tenant_onboarding.sql` | `tenant_stores`, `tenant_slug_aliases`, `tenant_wa_whitelist`, `trial_ends_at`, `tenant_owner` role |
| 4 | `20261015133000_aos_tasks_kasir_wa_source.sql` | Kasir WA task source tagging |
| 5 | `20261015140000_f2_3_tenant_wa_connection.sql` | `tenant_stores.owner_phone_verified_at`, `wa_kasir_activated_at`; legacy auto-activate when WA already live |

F2-2 recruit uses existing `aos_agents` — no dedicated F2-2 migration.

Post-apply: run §4 Klontong verification SQL.

---

## 4. Legacy Klontong slug mapping

Slug: **`umkm-warung-klontong-bahagia`**.

Migration `20261015120000_f2_1_tenant_onboarding.sql` ensures:

1. UUID row in `public.tenants` (if missing).
2. **`tenant_slug_aliases`**: string slug → UUID.
3. **`tenant_stores`**: `studio_slug = umkm-warung-klontong-bahagia`.
4. **`tenant_wa_whitelist`** seeded from `studio_whatsapp_config.business_phone` when present.

F2-3 migration may set `owner_phone_verified_at` / `wa_kasir_activated_at` when channel was already **enabled** with notebook + owner whitelist.

**Verify after migrate:**

```sql
SELECT slug, tenant_id FROM public.tenant_slug_aliases
WHERE slug = 'umkm-warung-klontong-bahagia';

SELECT tenant_id, display_name, studio_slug,
       owner_phone_verified_at, wa_kasir_activated_at
FROM public.tenant_stores
WHERE studio_slug = 'umkm-warung-klontong-bahagia';
```

Resolve backlog **D-4**: prod notebooks / `studio_whatsapp_config` / AOS rows keyed by string slug still reachable.

Detail: [f2-1-prod-readiness.md §4](f2-1-prod-readiness.md).

---

## 5. Functional smoke (end-to-end wedge)

Run on staging first; prod only after Akbar deploy approval.

### F2-1 — Register & verify

| Step | Expected |
|------|----------|
| `registerTenant` without captcha | 400 captcha required |
| `/register` + valid Turnstile + new email | Success; **no** JWT until email confirmed |
| Sign-in before confirm (`tenant_owner`) | Email verification required |
| Confirm email → sign-in | JWT; Virtual Office empty floor + onboarding banner |

E2E: `admin/tests/e2e/f2-1-onboarding.spec.ts`.

### F2-2 — Recruit Kasir

| Step | Expected |
|------|----------|
| `/admin/recruit` as `tenant_owner` | Kasir + Service Desk + Finance + Sales + DevOps + Security + Facilities **Rekrut sekarang** (F3-1/F3-5…F3-9); CS/Stok cards “Segera hadir” |
| After recruit | Kasir on Virtual Office; message mentions F2-3 WA |
| 4th recruit attempt (trial) | Blocked at cap **3** |
| Outbound customer WA (cron/push) | Blocked until F2-3 connected |

E2E: `admin/tests/e2e/f2-2-recruit-fullstack.spec.ts`.

### F2-3 — Connect WA

| Step | Expected |
|------|----------|
| `/admin/connect-wa` | Phone → OTP → staff whitelist (max 5) → **Aktifkan** |
| `tenant_owner` → `/admin/ai-studio/umkm` | Redirect to connect wizard |
| Before Aktifkan | Outbound gate still closed |
| After OTP + Aktifkan + notebook | **WA terhubung**; outbound gate open |
| Production OTP | Real WA to owner only (no `WA_OTP_MOCK`) |

E2E: `admin/tests/e2e/f2-3-connect-wa-fullstack.spec.ts` (use mock OTP in QA only).

---

## 6. References

| Doc | Relevance |
|-----|-----------|
| [f2-1-prod-readiness.md](f2-1-prod-readiness.md) | Captcha + SMTP deep dive |
| [f2-2-recruit-flow.md](f2-2-recruit-flow.md) | Owner / platform admin flows |
| [f2-3-connect-wa-flow.md](f2-3-connect-wa-flow.md) | Shared inbox, OTP env, in-memory limits |
| [deploy-master-production.md](../deploy-master-production.md) | Production deploy ritual |
