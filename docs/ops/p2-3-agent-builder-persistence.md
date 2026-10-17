# P2-3 — Agent Builder persisted workflows

**Decision:** New table `studio_agent_workflows` + Studio GraphQL (same pattern as P2-1/P2-2), **not** extending `aos_playbooks`.

| Option | Why not / why yes |
|--------|-------------------|
| `aos_playbooks` | Procedural step lists tied to Agentic OS modules/routes — no visual graph, different UX contract. |
| `automation_workflows` | DevOps/n8n scope; not AI Studio tenant UX. |
| **`studio_agent_workflows`** | Tenant-scoped JSON graph (`nodes` / `edges`), optional `aos_playbook_id` link for future task dispatch. |

**UI honesty (F1-4):** Header **Live** + banner; palette cards remain static samples (audit: **MIXED** with explicit demo-path note).

**GraphQL:** `studioAgentWorkflows`, `createStudioAgentWorkflow`, `updateStudioAgentWorkflow`, `deleteStudioAgentWorkflow`, `recordStudioAgentWorkflowTestRun` — `GlobalAuthGuard` + `resolveAosTenant`.

**Test run:** Records `last_tested_at` only; full execution stays on Agentic OS task queue (out of P2-3 scope).
