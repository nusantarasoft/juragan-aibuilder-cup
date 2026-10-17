# F3-5 — Finance (accounting + reports) as third recruitable agent

**Status:** Implemented (this PR) · **Depends on:** F2-2 recruit, `/admin/accounting/*` module · **PO lock:** Finance SKU after Service Desk; queue order Finance → Sales → DevOps → Security → Facilities

Related: [f2-2-agent-catalog-recruit.md](f2-2-agent-catalog-recruit.md), [f2-2-recruit-flow.md](../ops/f2-2-recruit-flow.md), [f3-1-service-desk-recruit.md](f3-1-service-desk-recruit.md), Agent Studio preset `finance` in `admin/src/components/agentic-os/lib/catalog.ts`.

## Product

Trial **`tenant_owner`** sees three selectable SKUs on `/admin/recruit` (trial cap **3** active `aos_agents` unchanged):

| Order | SKU | Post-recruit |
|-------|-----|--------------|
| 1 | Kasir UMKM | Redirect `/admin/connect-wa` (F2-3) |
| 2 | Service Desk / ITSM | Redirect Virtual Office; ITSM at `/admin/itsm/*` |
| 3 | Finance | Redirect Virtual Office; accounting at `/admin/accounting/*` |

**Segera hadir (at F3-5 ship):** CS WhatsApp, Stok & gudang, plus foreshadow cards for **Sales (F3-6)**, **DevOps (F3-7)**, **Security (F3-8)**, **Facilities (F3-9)**. Sales went live in F3-6 — see [f3-6-sales-recruit.md](f3-6-sales-recruit.md).

## Server template (from `finance` preset)

- **Modules:** `accounting`, `reports`
- **Tools:** `module.read`, `module.draft`, `db.query`, `report.generate`, `activity.log`
- **Runner:** `cloud` (same as Service Desk)
- **Guardrails:** `denySend`, `denyShare`, `denyDelete`; `requireApproval: ['journal.post', 'write', 'send']`; `noAutoPostJournal: true`
- **Slug base:** `finance` (unique per tenant via `uniqueSlug`)

GraphQL: `aosRecruitAgent(templateId: "finance")`; status field `financeRecruited` parallel to `serviceDeskRecruited`.

## F1-4 honesty

Recruit copy states Finance uses **live tenant accounting/report data**, not demo cards. Recruited agents appear on Virtual Office from real `aos_agents` rows (same as Kasir / Service Desk).

## Out of scope (F3-5)

- Sales / DevOps / Security / Facilities recruitable SKUs (backlog F3-6…F3-9)
- Auto-posting journal entries or outbound send
- F3-4 pricing, F3-3 pilot roster
