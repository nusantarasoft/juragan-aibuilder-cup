# F3-1 — Service Desk (ITSM) as second recruitable agent

**Status:** Implemented (draft PR) · **Depends on:** F2-2 recruit, `/admin/itsm` module · **PO lock:** Service Desk SKU (not pembukuan/CS/stok)

Related: [f2-2-agent-catalog-recruit.md](f2-2-agent-catalog-recruit.md), [f2-2-recruit-flow.md](../ops/f2-2-recruit-flow.md), Agent Studio preset `service-desk` in `admin/src/components/agentic-os/lib/catalog.ts`.

## Product

Trial **`tenant_owner`** sees two selectable SKUs on `/admin/recruit`:

| Order | SKU | Post-recruit |
|-------|-----|--------------|
| 1 | Kasir UMKM | Redirect `/admin/connect-wa` (F2-3) |
| 2 | Service Desk / ITSM | Redirect Virtual Office; ITSM at `/admin/itsm/*` |

CS WhatsApp and Stok remain **Segera hadir**. Trial cap **3** active `aos_agents` unchanged.

## Server template (from `service-desk` preset)

- **Modules:** `itsm`, `knowledge`
- **Tools:** `module.read`, `module.draft`, `kb.search`, `ticket.comment`, `email.draft`, `activity.log` — no `ticket.close`
- **Runner:** `cloud` (ITSM triage; Kasir stays `browser` for WA)
- **Guardrails:** `denySend`, `denyShare`, `denyDelete`; `requireApproval: ['ticket.close', 'send']`; `noAutoCloseTickets: true`
- **Slug base:** `service-desk` (unique per tenant via `uniqueSlug`)

GraphQL: `aosRecruitAgent(templateId: "service-desk")`; status field `serviceDeskRecruited`.

## F1-4 honesty

Recruit copy states ITSM uses **live tenant data**, not demo cards. Recruited agents appear on Virtual Office from real `aos_agents` rows (same as Kasir).

## Out of scope (F3-1)

- Pembukuan / CS / stok recruitable SKUs
- Automated ticket closure or outbound email send
- Per-tenant ITSM seed beyond existing module routes
