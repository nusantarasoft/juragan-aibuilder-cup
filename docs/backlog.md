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
- [DONE] F3-7 **DevOps** recruitable SKU — merged [#65](https://github.com/nusantarasoft/nusantarasoft-3/pull/65) @ `f7dbd2b`; design [docs/design/f3-7-devops-recruit.md](design/f3-7-devops-recruit.md); ops [docs/ops/f3-7-recruit-flow.md](ops/f3-7-recruit-flow.md); QA PASS 2026-10-16 (`.gstack/qa-reports/qa-f3-7-devops-recruit-2026-10-16.md`)
- [DONE] F3-8 **Security** recruitable SKU — merged [#66](https://github.com/nusantarasoft/nusantarasoft-3/pull/66) @ `ad7286f`; design [docs/design/f3-8-security-recruit.md](design/f3-8-security-recruit.md); ops [docs/ops/f3-8-recruit-flow.md](ops/f3-8-recruit-flow.md); QA PASS 2026-10-16 (`.gstack/qa-reports/qa-f3-8-security-recruit-2026-10-16.md`)
- [DONE] F3-9 **Facilities** (BMS / DCIM / SCADA) recruitable SKU — merged [#67](https://github.com/nusantarasoft/nusantarasoft-3/pull/67) @ `3191c40`; design [docs/design/f3-9-facilities-recruit.md](design/f3-9-facilities-recruit.md); ops [docs/ops/f3-9-recruit-flow.md](ops/f3-9-recruit-flow.md); QA PASS 2026-10-16 (`.gstack/qa-reports/qa-f3-9-facilities-recruit-2026-10-16.md`)

**F3 recruit queue lock (Akbar 2026-10-16):** All seven Agent Studio wedge SKUs live on `/admin/recruit` (+ Kasir). CS WhatsApp + Stok/pembukuan remain **Segera hadir**.

## Fase 2+ — AI Studio depth (from D-3 / F1-4)
- [DONE] P2-1 Web Crawler backend (job queue, worker, persist jobs) — PR [#55](https://github.com/nusantarasoft/nusantarasoft-3/pull/55); QA PASS `.gstack/qa-reports/qa-p2-1-web-crawler-2026-10-15.md`; screenshots `/cursor/stores/self/media/p2-1-crawler-*.png`
- [DONE] P2-2 Knowledge Graph explorer wired to real embeddings / graph RPC (replace mock tree) — QA PASS 2026-10-15 (#56)
- [DONE] P2-3 Visual Agent Builder persisted workflows — PR [#57](https://github.com/nusantarasoft/nusantarasoft-3/pull/57); QA PASS `.gstack/qa-reports/qa-p2-3-agent-builder-2026-10-15.md`; screenshots `/cursor/stores/self/media/p2-3-builder-*.png`; ops [docs/ops/p2-3-agent-builder-persistence.md](ops/p2-3-agent-builder-persistence.md)
- [DONE] P2-4 Label Studio admin dashboard reads real project stats from Label Studio API — QA PASS `.gstack/qa-reports/qa-p2-4-label-studio-2026-10-15.md`; screenshots `/cursor/stores/self/media/p2-4-label-studio-*.png`
- [DONE] P2-5 Per-tenant dedicated WhatsApp business number (optional Hermes session per store) — PR [#59](https://github.com/nusantarasoft/nusantarasoft-3/pull/59) `cursor/p2-5-dedicated-wa-c20f`; design [docs/design/p2-5-dedicated-wa.md](design/p2-5-dedicated-wa.md); ops [docs/ops/p2-5-dedicated-wa.md](ops/p2-5-dedicated-wa.md); QA **PASS** (full gate) `.gstack/qa-reports/qa-p2-5-dedicated-wa-2026-10-15.md`; screenshots `/cursor/stores/self/media/p2-5-dedicated-wa-*.png`

## Discovered
(append here)
- [DONE] D-16 (UI-wave-2 @ `dc8fdd4`) Full Wave 1+2 browser audit on live stack — `.gstack/qa-reports/qa-ui-wave-2-admin-buttons-2026-10-16.md`; Wave 1 specs + `ui-wave-2-admin-buttons.spec.ts`
- [DONE] D-17 (UI-wave-2) Sidebar **Hubungkan WhatsApp** + wedge links under AI Studio for `tenant_owner` — `menuConfig.tsx`, `tenantOwnerMenu.ts`
- [DONE] D-19 (UI-wave-3 @ `5ebe69c`) Embed dashboards Refresh icons wired (`window.location.reload` + title) across datasets, infra, automation, collaboration, audit, tenants, messaging — `.gstack/qa-reports/qa-ui-wave-3-admin-buttons-2026-10-16.md`
- [DONE] D-20 (UI-wave-3) BMS prefers live API systems/alarms; empty charts when no telemetry; sample banner only when tenant has no BMS rows — seed `20261016000000_bms_scada_qa_tenant_seed.sql`
- [DONE] D-21 (UI-wave-4) Platform Metrics — Prometheus summary API + Demo tag / honest empty state (no fake SLO table as Live)
- [DONE] D-22 (UI-wave-4) SCADA historian GraphQL + trends live/sample banners; BMS energy sample banner; BMS dashboard charts stay empty until point history wired
- [DONE] D-23 (UI-wave-4) Full admin menuConfig + VO route crawl Playwright spec + coverage JSON (`.gstack/qa-reports/ui-wave-4-route-coverage.json`)
- [TODO] D-24 (UI-wave-4) HR module GraphQL expects `hr_*` tables — QA stack missing schema; pages show empty until migrations land
- [DONE] D-25 (UI-wave-4 PO #74) PM `me` query drops `fullName`; middleware PM lists use plain `select('*')` until tenant_users↔individuals FK lands
- **Adityo last-seen (`development-adityo`):** `861a6588fe93594528f1079b7e58cc624a6550de` (2026-10-16 13:03 WIB). **Do not merge or cherry-pick** from `development-adityo` — integration only via PO-approved D-9-style PRs on `master`.
- [TODO] D-26 (Adityo branch review @ `861a658`) Unresolved conflict markers + encoding garbage in `scripts/master-production/pull-on-server.sh` and `docs/deploy-master-production.md` on `development-adityo` — **master deploy-key version must win** when reconciling (no blind merge from his branch).
- [TODO] D-27 (Adityo branch review @ `861a658`) VO HUD rewrite drops Wave 1 honesty labels + Kasir-only metrics and switches ID→EN copy — needs **D-9-style integration PR** (preserve Wave 1 inspector / recruit honesty; do not land HUD wholesale).
- [TODO] D-28 (Adityo branch review @ `861a658`) `database_dump_data.sql` / `database_dump_full.sql` still tracked on `development-adityo` — tied to **F0-3** (rotate secrets + scrub branch history); do not import dumps into this repo.
- [TODO] D-31 (UI-wave-4 PO #74) QA compose omits Supabase Realtime — Playwright narrow ignore for `realtime/v1/websocket` 503 only (`console.ts`)
- [TODO] D-32 (UI-wave-4 PO #74) E-commerce `ecom_*` tables absent on minimal QA — narrow PGRST205 ignore until seed/migration
- [TODO] D-33 (UI-wave-4 PO #74) system-health storage probe 401 without service JWT — narrow ignore on `/storage/v1/bucket` until ops proxy
- [TODO] D-34 (UI-wave-4 PO #74) Agentic OS dynamic chunk flake on long crawl — narrow ignore for `Loading chunk … agentic-os`
- [TODO] D-35 (UI-wave-4 PO #74) Inventory `inv_*` / stock REST on QA — narrow PGRST205 until migrations seed
- [DONE] D-18 (UI-wave-1) VO inspector before/after — `.gstack/qa-reports/screenshots/ui-wave-1-vo-inspector-*-after.png` (Playwright on live stack, PR #70)
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
- [TODO] D-15 (F2 prod secrets) After `TURNSTILE_*` / `HCAPTCHA_*` and `WA_OTP_SECRET` are set on production middleware, **restore startup fail-closed** for missing captcha/OTP (revert relax-fail-closed boot) — track in [release-f2-prod-readiness.md](ops/release-f2-prod-readiness.md) §2
