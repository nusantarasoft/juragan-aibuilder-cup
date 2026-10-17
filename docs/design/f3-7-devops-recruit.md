# F3-7 — DevOps (pipelines + runbooks) as fifth recruitable agent

**Status:** Implemented (this PR) · **Depends on:** F2-2 recruit, `/admin/devops/*` module · **PO lock:** DevOps SKU after Sales; queue order Security → Facilities

Related: [f2-2-agent-catalog-recruit.md](f2-2-agent-catalog-recruit.md), [f3-6-sales-recruit.md](f3-6-sales-recruit.md), Agent Studio preset `devops` in `admin/src/components/agentic-os/lib/catalog.ts`.

## Product

Trial **`tenant_owner`** sees five selectable SKUs on `/admin/recruit` (trial cap **3** active `aos_agents` unchanged — pick any three):

| Order | SKU | Post-recruit |
|-------|-----|--------------|
| 1 | Kasir UMKM | Redirect `/admin/connect-wa` (F2-3) |
| 2 | Service Desk / ITSM | Virtual Office; ITSM at `/admin/itsm/*` |
| 3 | Finance | Virtual Office; accounting at `/admin/accounting/*` |
| 4 | Sales | Virtual Office; CRM at `/admin/crm/dashboard` |
| 5 | DevOps | Virtual Office; pipelines at `/admin/devops/pipelines` |

**Segera hadir:** CS WhatsApp, Stok & gudang, plus foreshadow cards for **Security (F3-8)**, **Facilities (F3-9)**.

## Server template (from `devops` preset)

- **Modules:** `devops`, `infrastructure`, `ops`
- **Tools:** `module.read`, `module.draft`, `pipeline.trigger`, `runbook.execute`, `kb.search`, `activity.log`
- **Runner:** `cloud`
- **Guardrails:** `denySend`, `denyShare`, `denyDelete`; `requireApproval: ['pipeline.trigger', 'runbook.execute', 'deploy', 'write']`; `noAutoDeploy: true`
- **Slug base:** `devops` (unique per tenant via `uniqueSlug`)

GraphQL: `aosRecruitAgent(templateId: "devops")`; status field `devopsRecruited` parallel to `salesRecruited`.

## F1-4 honesty

Recruit copy states DevOps uses **live tenant pipeline / deployment data**, not demo cards. Recruited agents appear on Virtual Office from real `aos_agents` rows (same as prior SKUs).

## Out of scope (F3-7)

- Security / Facilities recruitable SKUs (backlog F3-8…F3-9)
- Auto-trigger pipelines, runbooks, or production deploy without human approval
- F3-4 pricing, F3-3 pilot roster
