# F2-4 — Per-tenant agent settings (design draft)

**Status:** Decisions (approved) · **Backlog:** F2-4 · **Owner:** PO-NS3  
**Updated:** 2026-10-15 · **Approved by:** Akbar (#50)  
**Scope:** Let **`tenant_owner`** tune recruited employees (Kasir first) without opening full Command Deck / Agent Studio. Builds on F2-2 recruit + F2-3 WA connect.

Related: [f2-2-agent-catalog-recruit.md](f2-2-agent-catalog-recruit.md), [f2-3-tenant-wa-connection.md](f2-3-tenant-wa-connection.md), [release-f2-prod-readiness.md](../ops/release-f2-prod-readiness.md).

---

## 1. Target outcome (Fase 2)

After recruit + WA connect, a store owner can:

1. **Pause / resume** Kasir (stop automatic work without deleting the agent).
2. Set **simple limits** (e.g. max replies per day) in plain language — not token budgets.
3. Optionally set **quiet hours** (no proactive outbound / pulse runs outside window) for v1 or v1.1 per Akbar.
4. See **honest status** on Virtual Office (“Kasir libur” vs “Kasir aktif”).

Out of scope for minimal F2-4: editing persona/system prompt, tool lists, enterprise Pulse caps UI, per-routine cron editor, billing plans.

---

## 2. How it works today

### 2.1 Tenant owner surfaces

| Surface | Behavior | Evidence |
|---------|----------|----------|
| Virtual Office | Live roster from AOS agents; no settings panel | `admin/src/app/admin/virtual-office/page.tsx:1-9` |
| Recruit | Creates Kasir with fixed defaults | `middleware/src/agentic-os/aos-recruit.service.ts:93-114`, `aos-recruit.catalog.ts:58-82` |
| Connect WA | Channel + whitelist; not agent runtime settings | `admin/src/app/admin/connect-wa/page.tsx` |
| Agent Studio | Enterprise templates hidden for `tenant_owner` | `admin/src/components/agentic-os/apps/AgentStudio.tsx:70` |
| Command Deck / System settings | Full `aos_settings` (autopilot, caps, kill switch) | `admin/src/components/agentic-os/apps/SystemApps.tsx:300-344` — **platform-style**, not wedge copy |

There is **no** `/admin/agents/:id/settings` (or equivalent) for owners.

### 2.2 Data already in Postgres / GraphQL

| Layer | Fields relevant to F2-4 | Evidence |
|-------|-------------------------|----------|
| **`aos_agents`** | `status` ∈ `active` \| `paused` \| `offline`; `daily_token_budget`, `daily_run_budget`; `guardrails` JSON | `supabase/migrations/20261006000000_agentic_os.sql:61`, `agentic-os.types.ts:37-39`, `553` |
| **`aos_settings`** (tenant-wide) | `kill_switch`, `autopilot`, run/token ceilings, `pulse_enabled`, `llm_mode`, `ui_demo_mode` | `agentic-os.service.ts:279-296`, `agentic-os.types.ts:287-307` |
| **`aos_routines`** | `cron`, `timezone`, `enabled` — Pulse schedules | `supabase/migrations/20261006000000_agentic_os.sql:146+` |
| **`tenants.settings.recruit`** | Designed in F2-2 | **Not implemented** — cap is code constant `TRIAL_MAX_RECRUITED_AGENTS = 3` (`aos-recruit.service.ts:56-59`) |

GraphQL already exposes **`aosUpdateAgent`** with `status`, budgets, guardrails (`AosAgentInput`, `agentic-os.service.ts:836-857`) and **`aosUpdateSettings`** (`agentic-os.resolver.ts:728-735`). Guards require sign-in (`aos-auth.guard.ts:20-51`) but **do not restrict** `tenant_owner` vs `admin` on those mutations today.

### 2.3 Runtime enforcement (partial)

| Concern | Today | Gap |
|---------|--------|-----|
| Kasir paused | `status` column exists; runner/pulse may still enqueue unless checked | Need explicit “paused agent skips work” in Kasir path + Pulse |
| Outbound WA | Gated by F2-3 connect + guardrails | Independent of pause unless we wire `status !== active` |
| Tenant caps | `aos_settings` daily/rolling/monthly | Too expert for wedge UI; may mirror simplified “max balasan/hari” on agent row |

---

## 3. Gaps (product + eng)

1. **No owner UX** for pause/limits/schedule — only full Command Deck.
2. **Dangerous exposure:** owner JWT could call `aosUpdateSettings` / edit guardrails if they discover GraphQL.
3. **Copy mismatch:** backlog says “on/off, schedule, limits”; implemented recruit defaults are **immutable** after create.
4. **Schedule ambiguity:** Kasir is mostly **event-driven (WA inbound)**; “schedule” may mean quiet hours or disabling Pulse routines — not CRUD on `aos_routines` in v1.
5. **`tenants.settings` JSON** unused for per-store preferences (timezone, quiet hours).

---

## 4. Proposed minimal scope (implementation PR after Akbar)

### 4.1 UX (wedge)

- New **`/admin/my-agents`** or card on Virtual Office: list recruited agents (Kasir first).
- Per agent panel:
  - Toggle **Aktif / Libur** → maps to `aos_agents.status` `active` \| `paused`.
  - Slider or preset **Batas balasan harian** → maps to `daily_run_budget` (or new `owner_daily_reply_cap` if we want separation from eng budgets).
  - Optional **Jam operasional** (store timezone + start/end) → store in `tenants.settings.agents[kasirSlug]` or `aos_agents.guardrails.quietHours` until schema decision.

### 4.2 API / security

- New **`tenantOwnerUpdateAgentSettings`** mutation (narrow input) **or** role check inside existing update paths.
- **`tenant_owner` deny list:** cannot change `persona`, `systemPrompt`, `tools`, `permissions`, `kill_switch`, `llm_mode`, token budgets at tenant level.
- Platform **`admin`/`super_admin`** keep Command Deck.

### 4.3 Enforcement

- Kasir consult + outbound: if agent `paused` or outside quiet hours → polite auto-reply or queue for next window (Akbar chooses).
- Pulse: skip routines bound to paused agents.

---

## 5. Decisions (approved)

| # | Decision | Approved choice |
|---|----------|-----------------|
| **D1** | Primary surface | **`/admin/my-agents`** plus Virtual Office: click agent card → **drawer** with same settings panel |
| **D2** | Pause semantics | Toggle maps to `aos_agents.status` **`paused`**; VO shows **“Libur”**; **no auto replies or background work** while paused |
| **D3** | Limits v1 | **Max balasan/hari** → `aos_agents.daily_run_budget` (owner-facing copy, not token budgets) |
| **D4** | Schedule v1 | **Quiet hours only** in v1 (no cron / routine editor) |
| **D5** | Quiet hours storage | **`tenants.settings.agents`** JSON (per agent slug / id key) |
| **D6** | Kill switch | **Platform admin only**; tenants use **pause**, not tenant-wide kill switch |
| **D7** | GraphQL hardening | **Narrow tenant-scoped mutation** with role checks — not full Command Deck `aosUpdateAgent` / `aosUpdateSettings` for `tenant_owner` |
| **D8** | Multi-agent (F3-1 prep) | **Same panel** for every recruited agent (Kasir first, scales to more SKUs) |

### Implementation notes (from approved design)

- Owner UX: list on `/admin/my-agents`; VO reuses the same drawer component.
- Enforcement: Kasir inbound/outbound + Pulse skip when `status === paused` or outside quiet hours (tenant timezone).
- Security: `GlobalAuthGuard`; reject unauthenticated and cross-tenant; `tenant_owner` cannot set persona, tools, kill switch, or expert `aos_settings`.

---

## 6. References

| Doc / code | Relevance |
|------------|-----------|
| [docs/backlog.md](../backlog.md) | F2-4 item |
| [f2-2-agent-catalog-recruit.md](f2-2-agent-catalog-recruit.md) | Recruit defaults & D6 outbound gate |
| [middleware/src/agentic-os/aos-wa-outbound-gate.ts](../../middleware/src/agentic-os/aos-wa-outbound-gate.ts) | Customer send gate |
| [admin/src/components/agentic-os/apps/SystemApps.tsx](../../admin/src/components/agentic-os/apps/SystemApps.tsx) | Existing expert settings UI |
