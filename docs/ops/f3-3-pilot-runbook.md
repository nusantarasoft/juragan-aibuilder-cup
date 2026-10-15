# F3-3 — Pilot runbook (3–5 real stores)

**Status:** Ops · **Backlog:** F3-3 · **Owner:** PO-NS3  
**Updated:** 2026-10-15  
**Design:** [docs/design/f3-3-pilot.md](../design/f3-3-pilot.md)  
**Prod gate (before public `/register`):** [release-f2-prod-readiness.md](release-f2-prod-readiness.md) — Turnstile, SMTP, `WA_OTP_SECRET`, migrations, Akbar deploy.

**Do not merge/deploy** unless PO directs. This runbook assumes target stack includes **`master` @ `a122ab8`** (F3-1 + F3-2 on top of F2 wedge).

---

## 1. Roles & inputs

| Role | Responsibility |
|------|----------------|
| **PO** | Store roster, owner comms, debriefs, backlog triage |
| **Akbar / platform** | Deploy approval, Hermes shared inbox paired, prod env vars |
| **Ops (Cursor or human)** | Shadow onboarding, run checklists, log smoke results |

### What PO / Akbar provide **before** each store

| Input | Example | Used in |
|-------|---------|---------|
| **Store display name** | “Warung Bu Siti” | `/register` business name |
| **Owner email** | Real inbox for verification | Signup + login |
| **Owner mobile (OTP)** | E.164 or local format accepted by connect-wa | F2-3 OTP to owner WA |
| **Staff WA numbers** (1–5) | Kasir/staff phones | Whitelist after OTP |
| **Pilot slot ID** | P1…P5 | Roster table in design doc |

Optional: pre-created slug alias is **not** required — F2-1 provisions tenant + store on register.

---

## 2. Pre-pilot platform checklist (once per environment)

Run on **staging** first; repeat on **prod** only after Akbar deploy.

| # | Task | Pass | Ref |
|---|------|------|-----|
| E1 | Code at or after `a122ab8` on target host | `git rev-parse HEAD` | |
| E2 | All migrations through `20261015190000_p2_5_dedicated_wa.sql` applied | DB `\d tenant_stores` has WA columns | [release-f2-prod-readiness §3](release-f2-prod-readiness.md) |
| E3 | Middleware starts in prod mode | No captcha/WA OTP boot errors | §2 env |
| E4 | Turnstile widget on `/register` | Widget renders | [f2-1-prod-readiness.md](f2-1-prod-readiness.md) |
| E5 | Test email deliverability | Confirmation mail received | SMTP |
| E6 | Hermes shared WA paired | `/admin/ai-studio/ai-gateway` healthy | [f2-3-connect-wa-flow.md](f2-3-connect-wa-flow.md) |
| E7 | `WA_OTP_MOCK` **unset** on prod middleware | Real OTP path | |
| E8 | Platform smoke (automated or manual) | F2-1 → F2-2 → F2-3 green | release doc §5 |

**Staging-only QA:** `CAPTCHA_DISABLED=true`, `WA_OTP_MOCK=true`, raised onboarding rate limits — see [f2-2-recruit-flow.md](f2-2-recruit-flow.md).

---

## 3. Per-store execution checklist

Copy one block per store (P1…P5). Record **date/time (WIB)** and **operator initials**.

### Store: _______________  Pilot ID: P__  Date: __________

#### Phase A — Register & verify

| # | Step | ✓ | Notes |
|---|------|---|-------|
| A1 | Owner opens **`/register`** | | |
| A2 | Enter PO-provided **store name**, owner **email**, password | | |
| A3 | Complete **captcha** (Turnstile prod / dev token QA) | | |
| A4 | Submit → success message (no auto-login if email unverified) | | |
| A5 | Owner clicks **email verification** link | | |
| A6 | Owner **`/login`** → lands **Virtual Office** (empty floor OK) | | |

**If stuck:** check SMTP, spam folder, `ENABLE_EMAIL_AUTOCONFIRM` must be `false` in prod.

#### Phase B — Recruit Kasir (required)

| # | Step | ✓ | Notes |
|---|------|---|-------|
| B1 | Navigate **`/admin/recruit`** | | |
| B2 | **Kasir UMKM** → **Rekrut sekarang** | | |
| B3 | Redirect to **`/admin/connect-wa`** | | |
| B4 | Kasir visible on **Virtual Office** floor | | |

#### Phase C — Connect WA (required)

| # | Step | ✓ | Notes |
|---|------|---|-------|
| C1 | Enter **owner phone** (PO-provided) → request OTP | | |
| C2 | Owner receives OTP on **shared NS WA** (prod) or use mock code (staging) | | |
| C3 | Verify OTP | | |
| C4 | Add **staff whitelist** numbers (≤ 5) | | |
| C5 | **Aktifkan** → status **WA terhubung** | | |

**Avoid** middleware restart between C1–C5 (in-memory OTP). **Do not** opt into **dedicated WA** (P2-5) unless PO + [p2-5-dedicated-wa.md](p2-5-dedicated-wa.md) explicitly approved for this store.

#### Phase D — Optional Service Desk

| # | Step | ✓ | Notes |
|---|------|---|-------|
| D1 | **`/admin/recruit`** → **Service Desk** → **Rekrut sekarang** | ☐ N/A | |
| D2 | Agent on VO; open **`/admin/itsm/tickets`** | | |

Skip if owner declines or trial cap concern (max **3** agents).

#### Phase E — Smoke (same day)

| # | Step | ✓ | Notes |
|---|------|---|-------|
| E1 | From **whitelisted** phone, send WA: `bantuan` or simple sale phrase | | |
| E2 | Kasir **reply received** within reasonable time | | |
| E3 | **Agentic OS** / VO shows Kasir activity (Live) | | |
| E4 | Owner opens **`/admin/usage`** — metrics load (7d) | | |
| E5 | (Optional) **`/admin/my-agents`** settings — Kasir on/off visible | F2-4 | |

#### Phase F — Handoff & feedback

| # | Step | ✓ | Notes |
|---|------|---|-------|
| F1 | PO debrief scheduled (within 7 days) | | |
| F2 | Issues logged → [backlog.md](../backlog.md) **Discovered** with `(F3-3 pilot P_)` source | | |
| F3 | P0 escalated to Akbar immediately | | |

---

## 4. Troubleshooting (quick)

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| `/register` 400 captcha | Missing Turnstile token or prod captcha misconfig | Fix env per [f2-1-prod-readiness.md](f2-1-prod-readiness.md) |
| No verification email | SMTP / autoconfirm wrong | Auth env + relay |
| Middleware won’t start | `WA_OTP_SECRET` or captcha forbidden dev values | [release-f2-prod-readiness §2](release-f2-prod-readiness.md) |
| OTP never arrives | Hermes down, wrong owner phone, prod mock disabled | Check Hermes logs; retry OTP |
| OTP invalid after redeploy | In-memory pending cleared | Re-request OTP |
| Outbound Kasir silent | WA not **Aktifkan** or gate closed | Revisit connect-wa status |
| 4th recruit fails | Trial cap 3 | Expected — document if owner needs more |
| `/admin/ai-studio/umkm` redirect | F2-3 guard for `tenant_owner` | Use **`/admin/connect-wa`** |

---

## 5. Post-pilot consolidation

1. PO reviews all P1–P5 checklists.
2. Update [f3-3-pilot.md](../design/f3-3-pilot.md) roster table with final store names (no secrets).
3. Mark F3-3 **DONE** in backlog only when [done criteria](../backlog.md) met.
4. Open **follow-up PRs** for items tagged **F3-3-FU-*** in design §6.3 (e.g. extend release-f2 smoke for F3-1/F3-2).

---

## 6. References

| Doc | Purpose |
|-----|---------|
| [f2-2-recruit-flow.md](f2-2-recruit-flow.md) | Recruit owner path |
| [f2-3-connect-wa-flow.md](f2-3-connect-wa-flow.md) | OTP env, shared inbox |
| [f3-1-recruit-flow.md](f3-1-recruit-flow.md) | Service Desk optional |
| [deploy-master-production.md](../deploy-master-production.md) | Production deploy (Akbar only) |
