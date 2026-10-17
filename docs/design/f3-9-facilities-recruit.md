# F3-9 — Facilities (BMS / DCIM / SCADA) as seventh recruitable agent

**Status:** Implemented (this PR) · **Depends on:** F2-2 recruit, `/admin/bms/*`, `/admin/dcim/*`, `/admin/scada/*` · **PO lock:** Last queued Agent Studio SKU on `/admin/recruit`

Related: [f2-2-agent-catalog-recruit.md](f2-2-agent-catalog-recruit.md), [f3-8-security-recruit.md](f3-8-security-recruit.md), Agent Studio preset `facilities` in `admin/src/components/agentic-os/lib/catalog.ts`.

## Product

Trial **`tenant_owner`** sees seven selectable SKUs on `/admin/recruit` (trial cap **3** active `aos_agents` unchanged — pick any three):

| Order | SKU | Post-recruit |
|-------|-----|--------------|
| 1 | Kasir UMKM | Redirect `/admin/connect-wa` (F2-3) |
| 2 | Service Desk / ITSM | Virtual Office; ITSM at `/admin/itsm/*` |
| 3 | Finance | Virtual Office; accounting at `/admin/accounting/*` |
| 4 | Sales | Virtual Office; CRM at `/admin/crm/dashboard` |
| 5 | DevOps | Virtual Office; pipelines at `/admin/devops/pipelines` |
| 6 | Security | Virtual Office; assessment at `/admin/security/pentest` |
| 7 | Facilities | Virtual Office; BMS energy at `/admin/bms/energy` |

**Segera hadir:** CS WhatsApp, Stok & gudang only.

## Server template (from `facilities` preset)

- **Modules:** `bms`, `dcim`, `scada`
- **Tools:** `module.read`, `module.draft`, `ticket.create`, `activity.log`
- **Runner:** `cloud`
- **Guardrails:** `denySend`, `denyShare`, `denyDelete`; `requireApproval: ['ticket.create', 'write']`; `noAutoCloseWorkOrders: true`
- **Slug base:** `facilities` (unique per tenant via `uniqueSlug`)

GraphQL: `aosRecruitAgent(templateId: "facilities")`; status field `facilitiesRecruited` parallel to `securityRecruited`.

## F1-4 honesty

Recruit copy states Facilities uses **live tenant BMS/DCIM/SCADA telemetry**, not demo cards. Recruited agents appear on Virtual Office from real `aos_agents` rows (same as prior SKUs).

## Out of scope (F3-9)

- New CS/Stok recruitable templates
- Auto-close work orders or module writes without human approval
- F3-4 pricing, F3-3 pilot roster
