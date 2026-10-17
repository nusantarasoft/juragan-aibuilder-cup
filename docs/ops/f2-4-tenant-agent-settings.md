# F2-4 — Per-tenant agent settings (ops)

**Status:** Shipped in implementation PR · **Design:** [docs/design/f2-4-tenant-settings.md](../design/f2-4-tenant-settings.md)

## Surfaces

| Surface | Path | Notes |
|---------|------|--------|
| My agents | `/admin/my-agents` | List + settings panel per recruited agent |
| Virtual Office | Agent drawer | Same `AgentSettingsPanel` when agent has DB id |

## Owner controls (v1)

- **Libur / Aktif** → `aos_agents.status` (`paused` \| `active`)
- **Batas balasan/hari** → `aos_agents.daily_run_budget` (0 = unlimited)
- **Jam operasional** → `tenants.settings.agents[<slug>].quietHours`

## GraphQL (tenant-scoped)

- `aosTenantOwnerAgentSettingsList` / `aosTenantOwnerAgentSettings(agentId)`
- `aosTenantOwnerUpdateAgentSettings(agentId, input)` — narrow mutation; `GlobalAuthGuard` + `AosAuthGuard` on write

## Enforcement

- **Kasir WA** (`POST /internal/kasir-consult`): paused or outside quiet hours → polite static copy, no LLM consult
- **Pulse**: same gate after agent pause check
- **Kill switch**: unchanged — platform admin via Command Deck only

## Failure modes

| Symptom | Likely cause |
|---------|----------------|
| VO still shows old status | Refresh VO roster; settings panel patches local VO state on save |
| WA still replies while “Libur” | Hermes path not using kasir-consult, or phone not on store whitelist (gate skipped) |
| Quiet hours ignored | `quietHours.enabled` false or invalid HH:mm |
