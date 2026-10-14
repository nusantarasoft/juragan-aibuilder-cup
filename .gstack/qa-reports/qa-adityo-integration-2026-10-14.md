# QA — Adityo integration into master (PR #25)

**Date:** 2026-10-14  
**Branch:** `cursor/adityo-integration-master-7569`  
**Base:** `master` @ `2dba6838` (merged in)  
**PR:** [#25](https://github.com/nusantarasoft/nusantarasoft-3/pull/25)  
**Verdict:** **PASS** (PO dump removal applied; no merge/deploy)

## PO actions (this run)

| Action | Status |
|--------|--------|
| Remove `database_dump_data.sql` / `database_dump_full.sql` from branch tip | Done (`git rm`) |
| Add `.gitignore` `database_dump*.sql` | Done |
| Dump inspection (table names only) | See below |

### Dump inspection — real tenant/customer data?

**YES** — full PostgreSQL data dumps (UTF-16), not schema-only. Included `auth.users` (with password hashes), `auth.sessions`, `public.accounts` / `contacts` / `tenant_users`, `studio_whatsapp_*`, `ecom_customers`, `storage.objects`, `vault.secrets`, and broad tenant-scoped module data. Suitable for local dev restore only; must not ship in git.

**263 table names** (COPY targets): listed in Project store  
`/cursor/stores/bc-ffbd38c7-e468-5c00-9d54-d4915a5f658f/internal/adityo-dump-table-names-2026-10-14.txt`  
(no row content captured).

**Note:** Removing files from tip does not rewrite history; Akbar may still want `git filter-repo`/BFG if dumps were ever pushed on other branches.

## Scope vs master (after merge + dump removal)

| Area | Change |
|------|--------|
| Admin Agentic OS | Command Deck graph UI (`CommandDeck.tsx`, `DeckGraph.tsx`, `DeckOrbit.tsx`, `deckGraph.ts`, `AgenticOsDesktop.tsx`, workspace/overlay wiring) |
| Middleware | **No new resolvers** — existing `AosAuthGuard` / `GlobalAuthGuard` from master unchanged |
| Deploy | Merge kept master `pull-on-server.sh` inlined Hermes backup + deploy-key docs |
| Migrations | **None** in Adityo delta |
| Env / Hermes / WA | **No new env flags**; WA/Hermes paths unchanged on this PR |

## Access control audit (Adityo delta)

No new GraphQL resolvers or REST controllers in the integration diff. Agentic OS surface remains `@UseGuards(AosAuthGuard)` on master.

## Gates

| Gate | Command / check | Result |
|------|-----------------|--------|
| middleware build | `cd middleware && npm run build` | **PASS** |
| admin build | `cd admin && npm run build` (after `npm install --legacy-peer-deps`) | **PASS** |
| HTTP E2E | `KASIR_CONSULT_KEY=test-kasir-key-local node middleware/scripts/access-control-e2e.mjs` | **PASS** 24/24 |
| middleware auth tests | `npm run test -- src/auth` | **PASS** (52 tests) |
| Browser — login | Playwright vs `:3003`, real GraphQL | **PASS** |
| Browser — Virtual Office Live/Demo | `Live` + `Demo` badges visible | **PASS** |
| Browser — Command Deck | `/admin/agentic-os`, `AI OS` header visible | **PASS** |
| Browser console | No uncaught errors (404/favicon ignored) | **PASS** |

### Browser notes (manual QA)

On partial local stack (no Supabase Realtime on `:54321`), DevTools may show repeated `ERR_CONNECTION_REFUSED` to `ws://127.0.0.1:54321/realtime/v1/websocket`. Non-blocking for Command Deck / Virtual Office / Live vs Demo checks. Optional React 18 “notice in render” warning observed once; not Adityo-specific.

## Browser artifacts

| File | Step |
|------|------|
| `/cursor/stores/self/media/adityo-integration-login.png` | Login |
| `/cursor/stores/self/media/adityo-integration-virtual-office.png` | Virtual Office roster |
| `/cursor/stores/self/media/adityo-integration-command-deck.png` | Agentic OS Command Deck (Overview) |

## Stack (agent VM)

Docker Postgres + auth/rest/kong (QA override), host middleware `:4001`, admin `:3003`, landing `:3000`. Admin user `admin@nusantarasoft.local`.

## Risks for PO merge

1. **Dump history** — if dumps existed on remote before removal, consider history cleanup.
2. **Large UI diff** — Command Deck is admin-only; regression surface is Agentic OS / Virtual Office UX.
3. **No Hermes/deploy behavior change** beyond merge conflict resolution (master wins on deploy scripts).

## PO

Do **not** merge until PO sign-off. This QA run does not deploy.
