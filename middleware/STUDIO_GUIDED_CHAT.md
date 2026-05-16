# Studio: free chat vs guided chat

## Free chat (`studioChat`)

- Internal LLM conversation: each user message is answered directly by the built-in chat engine.
- No playbook state; `studio_conversations` rows have `guide_flow_id` null.

## Guided chat (`startStudioGuidedSession` + `studioGuidedChat`)

- Executes a **versioned guide flow** stored in `studio_guide_flows.definition` (validated JSON: `start`, `message`, `listen`, `rag`, `end` nodes).
- **Deterministic branching** uses `listen` transitions (`keyword`, `regex`, `default`).
- `rag` node type runs **notebook RAG**: vector search on `studio_source_chunks`, optional Supabase/Dremio context from `studio_notebooks.context_config`, then grounded LLM answer with citations.
- `sql` node type runs a **read-only SELECT** against Dremio (notebook `dremio_context_paths` or per-node `context`).
- **Query understanding & rewriting**: before each `rag` step, the middleware runs a structured JSON pass (Vertex) to normalize language, infer `main_intent`, and produce `rewritten_query`. Results are stored on `guide_flow_context` as `queryUnderstanding` (full object) and `rewrittenQuery` (string) for downstream steps such as intent routing.
- **RAG instruction placeholders** (see `substituteInstruction` in `guide-flow.interpreter.ts`):
  - `{{lastUserMessage}}` — after query understanding, resolves to **`rewritten_query`** when available (so existing flows keep using one placeholder for the text sent into the answer step); otherwise the raw last user line.
  - `{{originalUserMessage}}` — always the raw user line from the turn.
  - `{{rewrittenQuery}}` — explicit rewritten string (empty if none).
- **Clarification**: if `needs_clarification` is true and the flow reached `rag` from a `listen` node, the assistant sends `clarification_question`, the conversation waits again on that **same** `listen` node (no answer call), and `studio_guide_flow_events` records `query_clarification`. If clarification is needed but there was no preceding `listen` in the same drain (unusual graph), the server logs a warning and continues to the answer step.
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
