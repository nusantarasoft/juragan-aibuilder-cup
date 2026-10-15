# QA — D-9 Adityo deck integration

**Date:** 2026-10-15  
**Branch:** `cursor/d9-adityo-deck-fba0`  
**PR:** [#54](https://github.com/nusantarasoft/nusantarasoft-3/pull/54)  
**Base:** `origin/master` @ `e3c357a`  
**Head (QA PASS):** `bd80930` (includes `259fcd7` QA harness commit)  
**Source commit:** `c1fdc757a489d513395a9df394e1012a75c9d4ed` (deck files only)  
**Verdict:** **PASS** — full-stack browser QA on live GraphQL (no route mocks). **Merge SHA:** pending PO merge of #54.

## Scope applied

| Path | Action |
|------|--------|
| `CommandDeck.tsx`, `DeckGraph.tsx`, `lib/deckGraph.ts` | From `c1fdc757` — unified graph (timeline + orbit in `DeckGraph`) |
| `DeckOrbit.tsx`, `DeckTimeline.tsx` | **Removed** (−516 lines) |
| `AgenticOsDesktop.tsx` | **Not taken** from Adityo — master F1-4 `RosterKindBadge` / `rosterKindForAgent` preserved |
| `database_dump*.sql`, deploy script deltas, README | **Excluded** |
| GraphQL / middleware | **No changes** |

## Secret / dump scan

PR diff: admin deck TS/TSX + QA harness only. No `.env`, credentials, or `database_dump*.sql`.

## Gates

| Gate | Result | Notes |
|------|--------|-------|
| `middleware npm run build` | **PASS** | prior run |
| `admin npm run build` | **PASS** | prior run |
| `admin` F1-4 unit | **PASS** | `firstEmployee.spec.ts` |
| `middleware` agentic-os auth | **PASS** | `aos-tenant-agent-settings.graphql.auth`, `aos-agent-work-gate` (7 tests) |
| Docker + `qa-bootstrap-f1-4-stack.sh` | **PASS** | `docker.io` + manual `dockerd` |
| Migrations | **PASS** | `apply-migrations.sh` — 90 tracked, 0 failures |
| Full stack `:4001`/`:3003` | **PASS** | tmux `npm run start:dev` / `npm run dev` |
| Playwright `d9-deck-fullstack.spec.ts` | **PASS** | 2/2 chromium, live GraphQL |
| Playwright `f1-4-live-demo-fullstack.spec.ts` | **PASS** | 3/3 — F1-4 Live/Demo regression |
| `access-control-e2e.mjs` | **SKIP** | `ENOENT` `middleware/volumes/nginx/nginx.conf` (nginx fixture not in tree; unrelated to deck) |

## Browser artifacts

| File | Step |
|------|------|
| `/cursor/stores/self/media/d9-deck-overview-live.png` | Command Deck RINGS + **Live** badge |
| `/cursor/stores/self/media/d9-deck-timeline.png` | TIMELINE view |
| `/cursor/stores/self/media/d9-deck-orbit.png` | 3D ORBIT view |
| `/cursor/stores/self/media/d9-deck-rings.png` | RINGS view |
| `/cursor/stores/self/media/d9-deck-vo-live.png` | Virtual Office **Live** |
| `/cursor/stores/self/media/d9-deck-vo-demo.png` | Virtual Office **Demo** |

## Stack (this run)

```bash
sudo apt-get install -y docker.io docker-compose-v2
sudo dockerd &
bash scripts/qa-bootstrap-f1-4-stack.sh
PG_CONTAINER=postgres POSTGRES_DB=nusantarasoft sudo bash scripts/master-production/apply-migrations.sh
# middleware/.env.local + admin/.env.local (gitignored QA keys)
bash scripts/d9-browser-qa.sh
```

## PO

- QA **PASS** — PO may merge #54 when ready. **Do not deploy** until release checklist. **Do not start F3-1.**
