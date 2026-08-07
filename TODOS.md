# TODOS

## Auth

### Auth Phase 2: httpOnly session cookie

**What:** Replace presence cookie `ns_auth=1` with httpOnly session cookie (optional Nest cookie auth); reduce localStorage JWT dependence for UI gate.

**Why:** Presence flag is spoofable; XSS can still steal LS tokens. HOLD gate closes “admin page without login” but is not final auth posture.

**Context:** CEO HOLD review 2026-08-07 chose hybrid presence cookie + AuthGate; API already uses `GqlAuthGuard`. Start from `admin/src/middleware.ts` + `graphqlClient` cookie helpers after HOLD ships.

**Effort:** L
**Priority:** P2
**Depends on:** HOLD admin auth gate shipped

### Playwright e2e for admin auth gate

**What:** E2E: anon `/admin` → login; safe `?next=`; `/shared/studio/:token` public; logout clears cookie.

**Why:** Unit tests miss middleware matcher + real browser cookie behavior.

**Context:** HOLD chose unit + manual smoke (D8). Add after HOLD gate + Playwright CI is green.

**Effort:** M
**Priority:** P3
**Depends on:** HOLD auth gate shipped; Playwright CI healthy

## Completed
