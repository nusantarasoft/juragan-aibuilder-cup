# F2-1 — Production readiness checklist (tenant self-serve onboarding)

**Status:** Ops runbook · **Backlog:** F2-1 (merged [#42](https://github.com/nusantarasoft/nusantarasoft-3/pull/42) @ `e6424f2`) · **Owner:** PO-NS3  
**Updated:** 2026-10-15  
**Scope:** Pre-deploy / post-migrate verification for web `/register`, email verification gate, captcha, and legacy slug mapping. **Do not deploy** until Akbar approves and this checklist is green.

**F2 bundle:** For F2-2 + F2-3 together with F2-1, use the combined gate [release-f2-prod-readiness.md](release-f2-prod-readiness.md) (migrations, env, smoke). This file remains the F2-1 captcha/SMTP/Klontong detail reference.

Design reference: [docs/design/f2-1-tenant-onboarding.md](../design/f2-1-tenant-onboarding.md).

---

## 1. Pre-flight (before promoting to production)

| # | Check | Pass criteria |
|---|--------|----------------|
| 1 | Code on target branch | `master` includes `e6424f2` (F2-1) |
| 2 | DB migrations applied | `20261015120000_f2_1_tenant_onboarding.sql` (and prior) applied on prod Postgres |
| 3 | Middleware env — captcha | See §2; **`nsoft3-middleware` must start** (fail-closed on bad config) |
| 4 | Auth env — real email | See §3; **`ENABLE_EMAIL_AUTOCONFIRM=false`** |
| 5 | SMTP delivers | Confirmation email received at a real inbox (not Mailpit/fake only) |
| 6 | Admin `/register` | Turnstile widget renders when `mode=turnstile` + site key present |
| 7 | Legacy tenant | Post-migrate: `tenant_slug_aliases` row for `umkm-warung-klontong-bahagia` (§4) |
| 8 | Smoke (no deploy from this doc alone) | Follow [docs/deploy-master-production.md](../deploy-master-production.md) gate after Akbar |

---

## 2. Captcha — middleware production `.env` (startup fail-closed)

On boot, `CaptchaService.onModuleInit()` calls `assertOnboardingProductionConfig()` when `NODE_ENV=production`. **Missing or forbidden values prevent middleware from starting.**

### Required (pick one provider)

| Variable | Where | Purpose |
|----------|--------|---------|
| `TURNSTILE_SECRET_KEY` | **middleware** `.env` | Cloudflare Turnstile server verify (preferred if using Turnstile widget on `/register`) |
| `HCAPTCHA_SECRET` | **middleware** `.env` | hCaptcha server verify (alternative if not using Turnstile) |

At least **one** of the above must be non-empty in production.

### Site key (Turnstile widget on admin)

| Variable | Where | Purpose |
|----------|--------|---------|
| `TURNSTILE_SITE_KEY` or `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | **middleware** (read by GraphQL `onboardingCaptchaConfig.siteKey`) | Public site key returned to `/register` for Turnstile render |

Register page only loads the Turnstile script when `mode === "turnstile"` and `siteKey` is set (`admin/src/app/register/page.tsx`).

### Rate limits (optional overrides)

| Variable | Default | Purpose |
|----------|---------|---------|
| `ONBOARDING_RATE_LIMIT_MAX` | `5` | Max `registerTenant` attempts per IP per window |
| `ONBOARDING_RATE_LIMIT_WINDOW_MS` | `3600000` | Window length (ms) |
| `ONBOARDING_RATE_LIMIT_EMAIL_MAX` | `3` | Max attempts per email per window |
| `ONBOARDING_WA_PROVISION_MAX_PER_PHONE_DAY` | `2` | WA DAFTAR / provision path cap per normalized phone per day |

### Forbidden in production (startup error if set)

| Variable | Reason |
|----------|--------|
| `CAPTCHA_DISABLED=true` | Blocked by `assertOnboardingProductionConfig` |
| `ONBOARDING_ALLOW_DEV_CAPTCHA=true` | Dev HMAC mint only; blocked in production |
| `ONBOARDING_CAPTCHA_SECRET=f2-1-dev-captcha` | Dev default; blocked in production |

### Local / QA only (never production)

| Variable | Purpose |
|----------|---------|
| `ONBOARDING_ALLOW_DEV_CAPTCHA=true` | Enables GraphQL `onboardingCaptchaDevToken` |
| `ONBOARDING_CAPTCHA_SECRET` | HMAC secret when dev captcha enabled (required in that mode) |

Reference: `middleware/src/onboarding/onboarding-env.ts`, `middleware/src/onboarding/captcha.service.ts`, `middleware/.env.local.example`.

---

## 3. SMTP / GoTrue — real email verification (not autoconfirm)

F2-1 returns **no JWT** from `registerTenant` until Supabase marks the user verified (`email_confirmed_at`). `tenant_owner` **cannot sign in** until verified (`middleware/src/auth/auth.service.ts`).

### Production `.env` (repo template: `.env.master-production.example`)

Set on the **host env file** consumed by `docker-compose.master-production.yml` (e.g. `.env.master-production` on server):

| Variable | Production value | Notes |
|----------|------------------|--------|
| `ENABLE_EMAIL_SIGNUP` | `true` | GoTrue: `GOTRUE_EXTERNAL_EMAIL_ENABLED` |
| `ENABLE_EMAIL_AUTOCONFIRM` | **`false`** | GoTrue: `GOTRUE_MAILER_AUTOCONFIRM` — must stay off for real verify |
| `SMTP_HOST` | Real relay host | Not `fake_mail` / Mailpit-only in prod |
| `SMTP_PORT` | e.g. `587` | TLS per provider |
| `SMTP_USER` / `SMTP_PASS` | Provider credentials | |
| `SMTP_ADMIN_EMAIL` | Bounce/admin address | |
| `SMTP_SENDER_NAME` | Display name | e.g. `Nusantarasoft` |
| `SITE_URL` | Public admin origin | Used by GoTrue for links |
| `ADDITIONAL_REDIRECT_URLS` | Allowed redirect list | Must include admin URL used after verify |

Mailer paths (already in template): `MAILER_URLPATHS_CONFIRMATION="/auth/v1/verify"` (and invite/recovery/email-change).

After changing auth mail settings: **restart `nsoft3-auth`** (GoTrue) and verify a signup from `/register` triggers a confirmation email.

---

## 4. Database migration & legacy slug mapping

Migration file: `supabase/migrations/20261015120000_f2_1_tenant_onboarding.sql`.

### What it adds

- `tenants.trial_ends_at`
- `tenant_slug_aliases` (studio string slug → UUID `tenants.id`)
- `tenant_stores` (one store row per tenant; `studio_slug` unique)
- `tenant_wa_whitelist` (owner/staff phones per store)
- `user_profiles.role` includes **`tenant_owner`**

### Legacy prod tenant (automatic block in migration)

For slug **`umkm-warung-klontong-bahagia`** the migration:

1. Ensures a UUID row in `public.tenants` (creates if missing; tenant slug column uses `{legacy_slug}-uuid` when new).
2. Upserts **`tenant_slug_aliases`** mapping `umkm-warung-klontong-bahagia` → that UUID.
3. Upserts **`tenant_stores`** with `studio_slug = umkm-warung-klontong-bahagia`.
4. Seeds **`tenant_wa_whitelist`** from existing `studio_whatsapp_config.business_phone` when present.

**Studio / Hermes / kasir tables keep using the string `tenant_id`**; new code resolves UUID via `tenant_slug_aliases` (`OnboardingService.resolveUuidFromStudioSlug`, provisioning services).

### Post-migrate verification (SQL or admin)

```sql
SELECT slug, tenant_id FROM public.tenant_slug_aliases
WHERE slug = 'umkm-warung-klontong-bahagia';

SELECT tenant_id, display_name, studio_slug FROM public.tenant_stores
WHERE studio_slug = 'umkm-warung-klontong-bahagia';
```

Resolve backlog **D-4**: confirm prod data (notebooks, `studio_whatsapp_config`, AOS rows keyed by string slug) still reachable after alias exists.

### Apply order on server

1. Deploy image with F2-1 code (when approved).
2. Run standard app migration step in `redeploy.sh` (same as other Supabase app migrations).
3. Re-run §1 checks 3–7.

---

## 5. Functional smoke (after deploy)

| Step | Expected |
|------|----------|
| `POST /graphql` `registerTenant` without captcha | 400 captcha required |
| `/register` with valid Turnstile + new email | Success message; **no** auto-login if unverified |
| Sign-in before email confirm (`tenant_owner`) | `Email verification required before sign in` |
| Confirm email → sign-in | JWT; Virtual Office shows **empty floor** + banner |
| `/admin/onboarding/wa-whitelist` | Owner can manage whitelist (post F2-1) |

E2E reference: `admin/tests/e2e/f2-1-onboarding.spec.ts` (stack-dependent).

---

## 6. References

| Doc | Relevance |
|-----|-----------|
| [docs/design/f2-1-tenant-onboarding.md](../design/f2-1-tenant-onboarding.md) | Locked product/security decisions |
| [docs/deploy-master-production.md](../deploy-master-production.md) | Deploy gate (separate approval) |
| [middleware/.env.local.example](../../middleware/.env.local.example) | Onboarding env comments |
| [.env.master-production.example](../../.env.master-production.example) | GoTrue/SMTP template |
