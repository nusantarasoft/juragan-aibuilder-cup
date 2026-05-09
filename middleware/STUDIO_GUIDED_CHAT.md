# Studio: free chat vs guided chat

## Free chat (`studioChat`)

- Internal LLM conversation: each user message is answered directly by the built-in chat engine.
- No playbook state; `studio_conversations` rows have `guide_flow_id` null.

## Guided chat (`startStudioGuidedSession` + `studioGuidedChat`)

- Executes a **versioned guide flow** stored in `studio_guide_flows.definition` (validated JSON: `start`, `message`, `listen`, `rag`, `end` nodes).
- **Deterministic branching** uses `listen` transitions (`keyword`, `regex`, `default`).
- `rag` node type is kept for backward compatibility in flow definitions, but runtime execution now uses internal LLM chat (no external RAGFlow dependency).
- State is persisted on `studio_conversations`: `guide_flow_id`, `guide_flow_node_id`, `guide_flow_context`.
- **Telemetry**: transitions are logged to `studio_guide_flow_events` for analytics.

## Publishing

- Only **one** `published` flow per notebook (partial unique index). Draft flows can still be edited and simulated from AI Studio.

## Applying SQL

- **Fresh Docker / init**: `studio` tables (including guide flows) load from [`volumes/db/studio_tables.sql`](volumes/db/studio_tables.sql) when Postgres is first created.
- **Existing volume** (DB already running): apply SQL manually. On the Supabase Postgres image, use **`supabase_admin`** so `CREATE TABLE` on `public` succeeds:

```bash
# From repo root (adjust database name if not nusantarasoft)
Get-Content .\volumes\db\studio_tables.sql -Raw | docker exec -i postgres psql -U supabase_admin -d nusantarasoft -v ON_ERROR_STOP=1
```

If `studio_*` tables already exist and you only need guide-flow objects, run `middleware/sql/studio_guide_flows.sql` the same way (still as `supabase_admin`).
