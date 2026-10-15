# F3-2 — Usage metrics per tenant & recruited agent

**Status:** Implemented (aggregate-only; no new counter tables).

## Goal

Give **tenant_owner** (and admins, tenant-scoped) a honest **Live** view of how their store uses recruited AI employees and Studio backends.

## Data sources (reuse only)

| Metric | Source |
|--------|--------|
| Tasks created / done / failed | `aos_tasks` (per `tenant_id`, `agent_id`, period on `created_at`) |
| Kasir WA mirror tasks | Same table, `source = 'kasir_wa'` |
| WA chats today | `studio_whatsapp_sessions` (`last_message_at`, Jakarta day — same as Kasir live) |
| Inbound / outbound WA messages | `studio_messages` joined via session `conversation_id`, roles `user` / `assistant` |
| Crawler jobs | `studio_web_crawl_jobs` |
| Agent builder activity | `studio_agent_workflows` (`updated_at` in period) |
| KG depth signal | RPC `studio_knowledge_graph_stats(p_tenant_id)` |

## API

GraphQL query `aosTenantUsageMetrics(tenantId?, days?)` → `AosTenantUsageMetrics` + `agents[]`.

Auth: `GlobalAuthGuard` + `tenantForRead` / `resolveAosTenant` (same as F2 recruit & settings).

## Admin UI

`/admin/usage` — Live banner (F1-4), period selector 7/30/90 days, cards + per-agent rows.

## Out of scope (F3-2)

Billing meters, token/cost rollups, new materialized views, F3-1/F3-3/F3-4.
