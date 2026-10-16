# NS3 Backlog — Superapp "rekrut agen AI seperti karyawan"
Updated: 2026-10-16. Owner: PO-NS3. Status: TODO / DOING / REVIEW (await Akbar) / DONE / BLOCKED / SKIPPED.
Rule: one DOING task at Cursor at a time (plus deploy). Gate: scope → PR → QA (backend + browser, build) → Akbar approve → merge → release → deploy → verify. New findings get appended as NEW items with a source.

## Fase 0 — Fondasi stabil
- [DONE] F0-1 Deploy #25 Command Deck + #27 + #29 (full detached) ke production — deployed `28bbbbc` (2026-10-15)
- [DONE] F0-2 (PR #31 doc) Audit dummy-vs-real (docs/audit/dummy-vs-real-2026-10-15.md)
- [TODO] F0-3 Rotate vault.secrets + Adityo cleans branch history (needs Akbar)
- [TODO] F0-4 Live WA test pendamping/tanya, then delete secrets files (needs Akbar)
- [TODO] F0-5 Clean up server deploy-key leftovers

## Fase 1 — Make Agentic OS & Virtual Office real
- [DONE] F1-1 Real Agentic OS task queue (DB table, worker, real status), replacing the simulation
- [DONE] F1-2 Virtual Office reads agent status/progress from the real task queue, per tenant
- [DONE] F1-3 Kasir WA agent writes its tasks/activity into the queue (visible in VO/AOS)
- [DONE] F1-4 Honest Live/Demo badges; remove remaining dummy data (per audit P0)

## Fase 2 — Rekrut agen (tenant self-serve)
- [DONE] F2-1 Self-serve tenant registration + onboarding — merged [#42](https://github.com/nusantarasoft/nusantarasoft-3/pull/42) @ `e6424f2`; design [docs/design/f2-1-tenant-onboarding.md](design/f2-1-tenant-onboarding.md); prod detail [docs/ops/f2-1-prod-readiness.md](ops/f2-1-prod-readiness.md)
- [DONE] F2-2 Agent catalog + "rekrut" flow — merged [#46](https://github.com/nusantarasoft/nusantarasoft-3/pull/46) @ `144a8ad`; `/admin/recruit`, one-click Kasir, trial cap 3; design [docs/design/f2-2-agent-catalog-recruit.md](design/f2-2-agent-catalog-recruit.md); ops [docs/ops/f2-2-recruit-flow.md](ops/f2-2-recruit-flow.md); QA PASS 2026-10-15 (`.gstack/qa-reports/qa-f2-2-agent-recruit-2026-10-15.md`)
- [DONE] F2-3 Connect channel (WA) per store (Kasir) — merged [#48](https://github.com/nusantarasoft/nusantarasoft-3/pull/48) @ `d0ec587`; design [docs/design/f2-3-tenant-wa-connection.md](design/f2-3-tenant-wa-connection.md); ops [docs/ops/f2-3-connect-wa-flow.md](ops/f2-3-connect-wa-flow.md)
- [DONE] F2-4 Per-tenant agent settings in AOS (on/off, schedule, limits) — merged [#51](https://github.com/nusantarasoft/nusantarasoft-3/pull/51) @ `4800eba`; design [docs/design/f2-4-tenant-settings.md](design/f2-4-tenant-settings.md) (#50 superseded); QA PASS 2026-10-15 (`.gstack/qa-reports/qa-f2-4-tenant-settings-2026-10-15.md`)
- **F2 wedge complete** (F2-1..F2-4) on `master` @ `4800eba`; **awaiting Akbar production deploy** — [docs/ops/release-f2-prod-readiness.md](ops/release-f2-prod-readiness.md)

## Fase 3 — Agen kedua & ready to use
- [DONE] F3-1 Second agent — **Service Desk / ITSM** (PO lock); `/admin/recruit` SKU #2; design [docs/design/f3-1-service-desk-recruit.md](design/f3-1-service-desk-recruit.md); ops [docs/ops/f3-1-recruit-flow.md](ops/f3-1-recruit-flow.md); QA PASS 2026-10-15 (`.gstack/qa-reports/qa-f3-1-service-desk-recruit-2026-10-15.md`); screenshots `/cursor/stores/self/media/f3-1-service-desk-*.png`
- [DONE] F3-2 Usage metrics per tenant/agent — merged [#60](https://github.com/nusantarasoft/nusantarasoft-3/pull/60) @ `9635883`; design [docs/design/f3-2-usage-metrics.md](design/f3-2-usage-metrics.md); QA `.gstack/qa-reports/qa-f3-2-usage-2026-10-15.md`; screenshots `/cursor/stores/self/media/f3-2-usage-*.png`
- [DOING] F3-3 Pilot with 3–5 real stores, then fix findings — **waiting on PO roster + prod deploy** (not closed in this PR); design [docs/design/f3-3-pilot.md](design/f3-3-pilot.md); ops [docs/ops/f3-3-pilot-runbook.md](ops/f3-3-pilot-runbook.md); baseline `master` @ `a122ab8`. **Done criteria:** (1) PO roster **3–5** stores with owner email + OTP phone + staff whitelist documented in design §3; (2) platform pre-pilot checklist (runbook §2) green on target env **or** explicit PO sign-off for staging-only pilot; (3) each enrolled store completes runbook §3 Phases A–C + smoke E1–E4; (4) optional Service Desk tracked per store (Phase D); (5) PO debrief + findings appended to **Discovered**; (6) no open **P0** at pilot close; (7) **no F3-4 pricing** work in this slice.
- [SKIPPED] F3-4 Pricing/subscription — **deferred** per Akbar (pricing skip); revisit after pilot / F3-5+ wedge
- [DONE] F3-5 **Finance** (accounting + reports) recruitable SKU — merged [#63](https://github.com/nusantarasoft/nusantarasoft-3/pull/63) @ `fc1b2e0`; design [docs/design/f3-5-finance-recruit.md](design/f3-5-finance-recruit.md); ops [docs/ops/f3-5-recruit-flow.md](ops/f3-5-recruit-flow.md); QA PASS 2026-10-16 (`.gstack/qa-reports/qa-f3-5-finance-recruit-2026-10-16.md`); screenshots `/cursor/stores/self/media/f3-5-finance-*.png`
- [DONE] F3-6 **Sales** (CRM + news) recruitable SKU — merged [#64](https://github.com/nusantarasoft/nusantarasoft-3/pull/64) @ `1f06645`; design [docs/design/f3-6-sales-recruit.md](design/f3-6-sales-recruit.md); ops [docs/ops/f3-6-recruit-flow.md](ops/f3-6-recruit-flow.md); QA PASS 2026-10-16 (`.gstack/qa-reports/qa-f3-6-sales-recruit-2026-10-16.md`); screenshots `/cursor/stores/self/media/f3-6-sales-*.png`
- [DOING] F3-7 **DevOps** recruitable SKU — PR `cursor/f3-7-devops-recruit-7f6e`; design [docs/design/f3-7-devops-recruit.md](design/f3-7-devops-recruit.md); ops [docs/ops/f3-7-recruit-flow.md](ops/f3-7-recruit-flow.md)
- [TODO] F3-8 **Security** recruitable SKU — backlog only
- [TODO] F3-9 **Facilities** (BMS / DCIM / SCADA) recruitable SKU — backlog only

**F3 recruit queue lock (Akbar 2026-10-16):** Finance → Sales → DevOps → Security → Facilities (CS WhatsApp + Stok/pembukuan remain **Segera hadir**).

## Fase 2+ — AI Studio depth (from D-3 / F1-4)
- [DONE] P2-1 Web Crawler backend (job queue, worker, persist jobs) — PR [#55](https://github.com/nusantarasoft/nusantarasoft-3/pull/55); QA PASS `.gstack/qa-reports/qa-p2-1-web-crawler-2026-10-15.md`; screenshots `/cursor/stores/self/media/p2-1-crawler-*.png`
- [DONE] P2-2 Knowledge Graph explorer wired to real embeddings / graph RPC (replace mock tree) — QA PASS 2026-10-15 (#56)
- [DONE] P2-3 Visual Agent Builder persisted workflows — PR [#57](https://github.com/nusantarasoft/nusantarasoft-3/pull/57); QA PASS `.gstack/qa-reports/qa-p2-3-agent-builder-2026-10-15.md`; screenshots `/cursor/stores/self/media/p2-3-builder-*.png`; ops [docs/ops/p2-3-agent-builder-persistence.md](ops/p2-3-agent-builder-persistence.md)
- [DONE] P2-4 Label Studio admin dashboard reads real project stats from Label Studio API — QA PASS `.gstack/qa-reports/qa-p2-4-label-studio-2026-10-15.md`; screenshots `/cursor/stores/self/media/p2-4-label-studio-*.png`
- [DONE] P2-5 Per-tenant dedicated WhatsApp business number (optional Hermes session per store) — PR [#59](https://github.com/nusantarasoft/nusantarasoft-3/pull/59) `cursor/p2-5-dedicated-wa-c20f`; design [docs/design/p2-5-dedicated-wa.md](design/p2-5-dedicated-wa.md); ops [docs/ops/p2-5-dedicated-wa.md](ops/p2-5-dedicated-wa.md); QA **PASS** (full gate) `.gstack/qa-reports/qa-p2-5-dedicated-wa-2026-10-15.md`; screenshots `/cursor/stores/self/media/p2-5-dedicated-wa-*.png`

## Discovered
(append here)
- [DONE] D-1 (audit #31) Wire VO Live mode to osAgentSource; mockAgentSource only in explicit demo mode  → F1-2
- [DONE] D-2 (audit #31) Fix misleading "Demo" badge on real DB agents in Agentic OS → F1-4
- [DONE] D-3 (audit #31) AI Studio Web Crawler / Knowledge Graph / Agent Builder: honest Live/Demo labels; P2-1…P2-3 backends shipped for crawler, KG, Agent Builder workflows
- [TODO] D-4 (audit #31) Verify tenant umkm-warung-klontong-bahagia exists in prod (not in seed)
- [TODO] D-5 (audit #31) Rerun audit browser check on the full stack (middleware was off) after deploy
- [DONE] D-6 (deploy hotfix) Ensure `/opt/nusantarasoft-3/logs` exists before SFTP pull-script upload (`deploy.ps1` mkdir guard; PR #29 detached deploy prod failure)
- [DONE] D-7 (deploy state) Write `logs/.deploy.state` at detached job start; `-Status`/`-Attach` trust live lock/PID when state stale; `deploy.ps1` syncs helper on attach/status (PO small fix PR)
- [DONE] D-8 (deploy status hotfix) Write `logs/.deploy.lock` with state before wrapper spawn; `-Status` treats in-flight state without PID; `deploy.ps1` brief idle retry on first poll — merged `39232b8` (#43)
- [DONE] D-10 F2-1 security hardening (captcha, rate limit, email verify, WA provision limits) — shipped in #42 @ `e6424f2`; ops [docs/ops/f2-1-prod-readiness.md](ops/f2-1-prod-readiness.md)
- [DONE] D-9 Integrate Adityo `development-adityo` @ `c1fdc757a489d513395a9df394e1012a75c9d4ed` (2026-10-14 19:02 WIB): deck UI merged to `master` @ `d8e1b16`; QA PASS — `.gstack/qa-reports/qa-d9-adityo-deck-2026-10-15.md`; screenshots `/cursor/stores/self/media/d9-deck-*.png`
- [TODO] D-11 (F3-3 review @ `a122ab8`) Extend [release-f2-prod-readiness.md](ops/release-f2-prod-readiness.md) §5 functional smoke with **F3-1 Service Desk recruit** and **F3-2 `/admin/usage`** — follow-up doc PR (F3-3-FU-1); pilot blocked on public prod signup until existing Turnstile + SMTP + `WA_OTP` gate green
- [TODO] D-12 (F3-3 review @ `a122ab8`) Pilot has no first-class in-app feedback capture — use PO debrief template in [f3-3-pilot.md](design/f3-3-pilot.md) §7 until product adds a form (optional backlog)
- [TODO] D-13 (F3-3 review @ `a122ab8`) Confirm F2+F3 deploy SHA on prod/staging before pilot — backlog still notes F2 wedge @ `4800eba` awaiting Akbar deploy; pilot target includes F3-1/F3-2 @ `a122ab8` (coordinate with [deploy-master-production.md](deploy-master-production.md))
- [TODO] D-14 (Akbar 2026-10-16 **all-queue**) Remaining Agent Studio templates queued on `/admin/recruit` as **Segera hadir** until F3-7…F3-9 ship; **Sales** goes live in F3-6 PR
