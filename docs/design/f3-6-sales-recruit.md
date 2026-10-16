# F3-6 — Sales (CRM + news) as fourth recruitable agent

**Status:** Implemented (this PR) · **Depends on:** F2-2 recruit, `/admin/crm/*` module · **PO lock:** Sales SKU after Finance; queue order DevOps → Security → Facilities

Related: [f2-2-agent-catalog-recruit.md](f2-2-agent-catalog-recruit.md), [f3-5-finance-recruit.md](f3-5-finance-recruit.md), Agent Studio preset `sales` in `admin/src/components/agentic-os/lib/catalog.ts`.

## Product

Trial **`tenant_owner`** sees four selectable SKUs on `/admin/recruit` (trial cap **3** active `aos_agents` unchanged — pick any three):

| Order | SKU | Post-recruit |
|-------|-----|--------------|
| 1 | Kasir UMKM | Redirect `/admin/connect-wa` (F2-3) |
| 2 | Service Desk / ITSM | Virtual Office; ITSM at `/admin/itsm/*` |
| 3 | Finance | Virtual Office; accounting at `/admin/accounting/*` |
| 4 | Sales | Virtual Office; CRM at `/admin/crm/dashboard` |

**Segera hadir (at F3-6 ship):** CS WhatsApp, Stok & gudang, plus foreshadow cards for **DevOps (F3-7)**, **Security (F3-8)**, **Facilities (F3-9)**. DevOps went live in F3-7.

## Server template (from `sales` preset)

- **Modules:** `crm`, `news`
- **Tools:** `module.read`, `module.draft`, `web.search`, `email.draft`, `activity.log`
- **Runner:** `cloud`
- **Guardrails:** `denySend`, `denyShare`, `denyDelete`; `requireApproval: ['send']`; `draftsOnlyOutbound: true`
- **Slug base:** `sales` (unique per tenant via `uniqueSlug`)

GraphQL: `aosRecruitAgent(templateId: "sales")`; status field `salesRecruited` parallel to `financeRecruited`.

## F1-4 honesty

Recruit copy states Sales uses **live tenant CRM / pipeline data**, not demo cards. Recruited agents appear on Virtual Office from real `aos_agents` rows (same as Kasir / Service Desk / Finance).

## Out of scope (F3-6)

- DevOps / Security / Facilities recruitable SKUs (backlog F3-7…F3-9)
- Auto-send email or outbound WhatsApp from Sales agent
- F3-4 pricing, F3-3 pilot roster
