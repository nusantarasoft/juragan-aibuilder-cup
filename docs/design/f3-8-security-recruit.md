# F3-8 — Security (assessment + remediation) as sixth recruitable agent

**Status:** Implemented (this PR) · **Depends on:** F2-2 recruit, `/admin/security/*` module · **PO lock:** Security SKU after DevOps; queue order Facilities (F3-9)

Related: [f2-2-agent-catalog-recruit.md](f2-2-agent-catalog-recruit.md), [f3-7-devops-recruit.md](f3-7-devops-recruit.md), Agent Studio preset `security` in `admin/src/components/agentic-os/lib/catalog.ts`.

## Product

Trial **`tenant_owner`** sees six selectable SKUs on `/admin/recruit` (trial cap **3** active `aos_agents` unchanged — pick any three):

| Order | SKU | Post-recruit |
|-------|-----|--------------|
| 1 | Kasir UMKM | Redirect `/admin/connect-wa` (F2-3) |
| 2 | Service Desk / ITSM | Virtual Office; ITSM at `/admin/itsm/*` |
| 3 | Finance | Virtual Office; accounting at `/admin/accounting/*` |
| 4 | Sales | Virtual Office; CRM at `/admin/crm/dashboard` |
| 5 | DevOps | Virtual Office; pipelines at `/admin/devops/pipelines` |
| 6 | Security | Virtual Office; assessment at `/admin/security/pentest` |

**Segera hadir:** CS WhatsApp, Stok & gudang, plus foreshadow card for **Facilities (F3-9)**.

## Server template (from `security` preset)

- **Modules:** `security`, `infrastructure`
- **Tools:** `module.read`, `module.draft`, `kb.search`, `ticket.create`, `activity.log`
- **Runner:** `cloud`
- **Guardrails:** `denySend`, `denyShare`, `denyDelete`; `requireApproval: ['ticket.create', 'write']`; `noAutoRemediation: true`
- **Slug base:** `security` (unique per tenant via `uniqueSlug`)

GraphQL: `aosRecruitAgent(templateId: "security")`; status field `securityRecruited` parallel to `devopsRecruited`.

## F1-4 honesty

Recruit copy states Security uses **live tenant assessment / finding data**, not demo cards. Recruited agents appear on Virtual Office from real `aos_agents` rows (same as prior SKUs).

## Out of scope (F3-8)

- Facilities recruitable SKU (backlog F3-9)
- Auto-create remediation tickets or module writes without human approval
- F3-4 pricing, F3-3 pilot roster
