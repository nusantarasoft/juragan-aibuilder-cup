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
- [DONE] F2-1 Self-serve tenant registration + onboarding — merged [#42](https://github.com/nusantarasoft/nusantarasoft-3/pull/42) @ `e6424f2`; design [docs/design/f2-1-tenant-onboarding.md](design/f2-1-tenant-onboarding.md); prod checklist [docs/ops/f2-1-prod-readiness.md](ops/f2-1-prod-readiness.md)
- [TODO] F2-2 Agent catalog + "rekrut" flow (pick agent, role, data access)
- [TODO] F2-3 Connect channel (WA) per agent/tenant, without manual setup
- [TODO] F2-4 Per-tenant agent settings in AOS (on/off, schedule, limits)

## Fase 3 — Agen kedua & ready to use
- [TODO] F3-1 Second agent (candidates: pembukuan/CS/stok, Akbar decides)
- [TODO] F3-2 Usage metrics per tenant/agent
- [TODO] F3-3 Pilot with 3–5 real stores, then fix findings
- [TODO] F3-4 Pricing/subscription (Akbar decides)

## Fase 2+ — AI Studio depth (from D-3 / F1-4)
- [TODO] P2-1 Web Crawler backend (job queue, worker, persist jobs) — replace `webCrawlerService` in-memory simulation
- [TODO] P2-2 Knowledge Graph explorer wired to real embeddings / graph RPC (replace mock tree)
- [TODO] P2-3 Visual Agent Builder persisted workflows (or fold into Agentic OS playbooks)
- [TODO] P2-4 Label Studio admin dashboard reads real project stats from Label Studio API

## Discovered
(append here)
- [DONE] D-1 (audit #31) Wire VO Live mode to osAgentSource; mockAgentSource only in explicit demo mode  → F1-2
- [DONE] D-2 (audit #31) Fix misleading "Demo" badge on real DB agents in Agentic OS → F1-4
- [DONE] D-3 (audit #31) AI Studio Web Crawler / Knowledge Graph / Agent Builder are client-side DEMO: label honestly now, make real later (P2)
- [TODO] D-4 (audit #31) Verify tenant umkm-warung-klontong-bahagia exists in prod (not in seed)
- [TODO] D-5 (audit #31) Rerun audit browser check on the full stack (middleware was off) after deploy
- [DONE] D-6 (deploy hotfix) Ensure `/opt/nusantarasoft-3/logs` exists before SFTP pull-script upload (`deploy.ps1` mkdir guard; PR #29 detached deploy prod failure)
- [DONE] D-7 (deploy state) Write `logs/.deploy.state` at detached job start; `-Status`/`-Attach` trust live lock/PID when state stale; `deploy.ps1` syncs helper on attach/status (PO small fix PR)
- [DONE] D-8 (deploy status hotfix) Write `logs/.deploy.lock` with state before wrapper spawn; `-Status` treats in-flight state without PID; `deploy.ps1` brief idle retry on first poll — merged `39232b8` (#43)
- [DONE] D-10 F2-1 security hardening (captcha, rate limit, email verify, WA provision limits) — shipped in #42 @ `e6424f2`; ops [docs/ops/f2-1-prod-readiness.md](ops/f2-1-prod-readiness.md)
- [TODO] D-9 Integrate Adityo `development-adityo` @ `c1fdc757a489d513395a9df394e1012a75c9d4ed` (2026-10-14 19:02 WIB): deck components not on master; after F2-1 merge, preserve F1-4 Live/Demo, full QA, no secrets/dumps
