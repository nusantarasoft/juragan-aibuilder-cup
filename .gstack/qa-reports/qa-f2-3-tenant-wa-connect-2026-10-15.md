# QA — F2-3 tenant WA connect (2026-10-15)

**Branch:** `cursor/f2-3-tenant-wa-impl-fd0b`  
**Head SHA:** 2c5ce9ca180e64ba15ef0d42bf8b687a84a9b090  
**Overall verdict:** **PASS**

## Screenshot index

| State | File | Result |
|-------|------|--------|
| Connect wizard entry | `/cursor/stores/self/media/f2-3-connect-wa-entry.png` | **PASS** |
| Owner OTP verified | `/cursor/stores/self/media/f2-3-owner-verified.png` | **PASS** |
| WA connected (Aktifkan) | `/cursor/stores/self/media/f2-3-wa-connected.png` | **PASS** |

Stack: Docker QA bootstrap + migrations + middleware `:4001` (`WA_OTP_MOCK=true`, `NODE_ENV=development`, `CAPTCHA_DISABLED=true`) + admin `:3003`. **No GraphQL mocks.**

## Verdict table

| Area | Gate | Result | Evidence |
|------|------|--------|----------|
| **Build** | `middleware npm run build` | **PASS** | nest build |
| **Build** | `admin npm run build` | **PASS** | next build |
| **Backend** | `wa-otp.service.spec.ts` (prod mock block, secret, Hermes sender, send fail) | **PASS** | 6 tests |
| **Backend** | `f2-3-wa-connection.security.spec.ts` + gate + onboarding | **PASS** | 25 tests |
| **Browser** | `f2-3-connect-wa-fullstack.spec.ts` chromium | **PASS** | 2/2 live GraphQL |
| **Browser** | Screenshots `f2-3-*.png` | **PASS** | 3 files |

## PO review fixes (OTP prod path)

- Production sends owner OTP via `WaOtpOutboundService` → Hermes `/send` (owner phone only); honest `503` if send fails.
- `WA_OTP_MOCK` ignored in production; startup **fail closed** if set in prod.
- `WA_OTP_SECRET` required in production (no dev default).
- Docs: in-memory pending OTP + rate limits (v1, restart resets).

## Commands run

```bash
cd middleware && npm test -- --run src/onboarding/wa-otp.service.spec.ts src/onboarding
bash scripts/f2-3-browser-qa.sh
cd middleware && npm run build && cd ../admin && npm run build
```

## Safety

- No merge / deploy / real customer WA in QA (mock OTP only in non-prod with `WA_OTP_MOCK=true`).
