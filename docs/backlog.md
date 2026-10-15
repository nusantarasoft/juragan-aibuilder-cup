# NS3 Backlog — Superapp "rekrut agen AI seperti karyawan"
Updated: 2026-10-15. Owner: PO-NS3. Status: TODO / DOING / REVIEW (await Akbar) / DONE / BLOCKED.
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
- [TODO] F3-1 Second agent (candidates: pembukuan/CS/stok, Akbar decides)
- [TODO] F3-2 Usage metrics per tenant/agent
- [TODO] F3-3 Pilot with 3–5 real stores, then fix findings
- [TODO] F3-4 Pricing/subscription (Akbar decides)

## Fase 2+ — AI Studio depth (from D-3 / F1-4)
- [DONE] P2-1 Web Crawler backend (job queue, worker, persist jobs) — PR [#55](https://github.com/nusantarasoft/nusantarasoft-3/pull/55); QA PASS `.gstack/qa-reports/qa-p2-1-web-crawler-2026-10-15.md`; screenshots `/cursor/stores/self/media/p2-1-crawler-*.png`
- [DONE] P2-2 Knowledge Graph explorer wired to real embeddings / graph RPC (replace mock tree) — QA PASS 2026-10-15 (#56)
- [DONE] P2-3 Visual Agent Builder persisted workflows — PR [#57](https://github.com/nusantarasoft/nusantarasoft-3/pull/57); QA PASS `.gstack/qa-reports/qa-p2-3-agent-builder-2026-10-15.md`; screenshots `/cursor/stores/self/media/p2-3-builder-*.png`; ops [docs/ops/p2-3-agent-builder-persistence.md](ops/p2-3-agent-builder-persistence.md)
- [TODO] P2-4 Label Studio admin dashboard reads real project stats from Label Studio API
- [TODO] P2-5 Per-tenant dedicated WhatsApp business number (optional Hermes session per store) — after F2-3 shared-inbox v1

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
