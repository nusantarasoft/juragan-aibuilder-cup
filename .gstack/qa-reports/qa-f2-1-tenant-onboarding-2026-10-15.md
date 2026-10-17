# QA — F2-1 tenant onboarding (2026-10-15, rev 2 — D-10 security)

Branch: `cursor/f2-1-tenant-onboarding-impl-5234`  
Rebased on: `master` @ `39232b8` (#43 D-8)

## Automated

| Gate | Result | Evidence |
|------|--------|----------|
| Middleware `npm run build` | PASS | nest build (trust proxy via Express adapter) |
| Middleware `npm run test` | PASS | 1313 passed incl. `onboarding.security.spec.ts`, auth unverified tenant_owner |
| Admin `npm run build` | PASS | next build |

## Security (D-10)

| Check | Result |
|-------|--------|
| Dev captcha mint disabled in `NODE_ENV=production` | PASS (unit) |
| Forged HMAC captcha rejected | PASS (unit) |
| Default `f2-1-dev-captcha` secret rejected on prod init | PASS (unit) |
| Rate limit per email + trusted `req.ip` (not raw XFF) | PASS (unit) |
| `registerTenant` no tokens when email unverified | PASS (unit) |
| `signIn` blocks unverified `tenant_owner` | PASS (unit) |
| WA auto-provision per-phone daily cap | PASS (code + unit path via registration service) |

In-memory rate limits reset on middleware restart (documented in `onboarding-rate-limit.ts`).

## Browser (full stack, no GraphQL mocks)

Stack: Docker + `qa-bootstrap-f1-4-stack.sh` + migrations + middleware `:4001` (`CAPTCHA_DISABLED=true` QA only) + admin `:3003`.

| Gate | Result | Evidence |
|------|--------|----------|
| `/register` + provisioning | PASS | Playwright `f2-1-onboarding.spec.ts` |
| Empty VO | PASS | screenshot `f2-1-empty-virtual-office.png` |
| WA whitelist admin | PASS | screenshot `f2-1-wa-whitelist-admin.png` |

Screenshots: `/cursor/stores/self/media/f2-1-*.png`

**Prod email verify:** QA uses GoTrue autoconfirm; production requires Turnstile/hCaptcha + no autoconfirm — covered by unit tests (no session/tokens before verify).

## Verdict

**PASS** — builds, security unit gates, and browser E2E green.
