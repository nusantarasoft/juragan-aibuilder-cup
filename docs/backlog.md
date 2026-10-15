# NS3 Backlog — Superapp "rekrut agen AI seperti karyawan"
Updated: 2026-10-15. Owner: PO-NS3. Status: TODO / DOING / REVIEW (await Akbar) / DONE / BLOCKED.
Rule: one DOING task at Cursor at a time (plus deploy). Gate: scope → PR → QA (backend + browser, build) → Akbar approve → merge → release → deploy → verify. New findings get appended as NEW items with a source.

## Fase 0 — Fondasi stabil
- [DOING] F0-1 Deploy #25 Command Deck + #27 + #29 (full detached) ke production
- [DONE] F0-2 (PR #31 doc) Audit dummy-vs-real (docs/audit/dummy-vs-real-2026-10-15.md)
- [TODO] F0-3 Rotate vault.secrets + Adityo cleans branch history (needs Akbar)
- [TODO] F0-4 Live WA test pendamping/tanya, then delete secrets files (needs Akbar)
- [TODO] F0-5 Clean up server deploy-key leftovers

## Fase 1 — Make Agentic OS & Virtual Office real
- [TODO] F1-1 Real Agentic OS task queue (DB table, worker, real status), replacing the simulation
- [TODO] F1-2 Virtual Office reads agent status/progress from the real task queue, per tenant
- [TODO] F1-3 Kasir WA agent writes its tasks/activity into the queue (visible in VO/AOS)
- [TODO] F1-4 Honest Live/Demo badges; remove remaining dummy data (per audit P0)

## Fase 2 — Rekrut agen (tenant self-serve)
- [TODO] F2-1 Self-serve tenant registration + onboarding
- [TODO] F2-2 Agent catalog + "rekrut" flow (pick agent, role, data access)
- [TODO] F2-3 Connect channel (WA) per agent/tenant, without manual setup
- [TODO] F2-4 Per-tenant agent settings in AOS (on/off, schedule, limits)

## Fase 3 — Agen kedua & ready to use
- [TODO] F3-1 Second agent (candidates: pembukuan/CS/stok, Akbar decides)
- [TODO] F3-2 Usage metrics per tenant/agent
- [TODO] F3-3 Pilot with 3–5 real stores, then fix findings
- [TODO] F3-4 Pricing/subscription (Akbar decides)

## Discovered
(append here)
- [TODO] D-1 (audit #31) Wire VO Live mode to osAgentSource; mockAgentSource only in explicit demo mode  → part of F1-2
- [TODO] D-2 (audit #31) Fix misleading "Demo" badge on real DB agents in Agentic OS → F1-4
- [TODO] D-3 (audit #31) AI Studio Web Crawler / Knowledge Graph / Agent Builder are client-side DEMO: label honestly now, make real later (P2)
- [TODO] D-4 (audit #31) Verify tenant umkm-warung-klontong-bahagia exists in prod (not in seed)
- [TODO] D-5 (audit #31) Rerun audit browser check on the full stack (middleware was off) after deploy
- [TODO] D-6 (deploy hotfix) Ensure `/opt/nusantarasoft-3/logs` exists before SFTP pull-script upload (`deploy.ps1` mkdir guard; PR #29 detached deploy prod failure)
